import os
import base64
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import cv2
import numpy as np
import mediapipe as mp
import cloudinary
import cloudinary.uploader

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MotionRank AI — Fitness Form Analyzer API")

# ─── CORS ────────────────────────────────────────────────────────────────────
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
allowed_origins = [
    frontend_url,
    "http://localhost:5173",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Cloudinary Config ───────────────────────────────────────────────────────
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
)

# ─── MediaPipe Setup ─────────────────────────────────────────────────────────
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

from analyzer import PushUpAnalyzer, SquatAnalyzer, CrunchAnalyzer

# Store active analyzers per-session (simple in-memory, fine for free tier)
analyzers = {}

# ─── Request / Response Models ───────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    frame: str  # base64 encoded JPEG image
    exercise_type: str = "pushup"  # "pushup", "squat", or "crunch"
    session_id: str = "default"

class ConnectionPoint(BaseModel):
    x: float
    y: float

class SkeletonConnection(BaseModel):
    start: ConnectionPoint
    end: ConnectionPoint

class AnalyzeResponse(BaseModel):
    status: str
    reps: int
    feedback: str
    stage: str
    form_quality: str = "good"  # "good" or "bad"
    connections: List[Dict[str, Any]] = []  # skeleton lines for overlay

class UploadResponse(BaseModel):
    url: str
    public_id: str

# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MotionRank AI Backend is running."}

@app.get("/health")
def health_check():
    """Health check endpoint for UptimeRobot keep-alive pinging."""
    return {"status": "healthy"}

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_frame(req: AnalyzeRequest):
    """
    REST endpoint for frame-by-frame exercise analysis.
    Accepts a base64-encoded JPEG frame, returns rep count, feedback,
    form quality (good/bad), and skeleton connection data for overlay drawing.
    """
    try:
        # Get or create analyzer for this session
        session_key = f"{req.session_id}_{req.exercise_type}"
        if session_key not in analyzers:
            if req.exercise_type == "squat":
                analyzers[session_key] = SquatAnalyzer()
            elif req.exercise_type == "crunch":
                analyzers[session_key] = CrunchAnalyzer()
            else:
                analyzers[session_key] = PushUpAnalyzer()

        analyzer = analyzers[session_key]

        # Decode base64 frame
        frame_bytes = base64.b64decode(req.frame)
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return AnalyzeResponse(
                status="error",
                reps=analyzer.counter,
                feedback="Could not decode frame.",
                stage=analyzer.stage,
                form_quality="bad",
                connections=[]
            )

        # Process with MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            rep_count, feedback, stage, form_quality, connections = analyzer.analyze(
                results.pose_landmarks.landmark
            )
        else:
            rep_count = analyzer.counter
            feedback = "No person detected. Make sure your full body is visible."
            stage = analyzer.stage
            form_quality = "bad"
            connections = []

        return AnalyzeResponse(
            status="processing",
            reps=rep_count,
            feedback=feedback,
            stage=stage,
            form_quality=form_quality,
            connections=connections
        )

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset-session")
async def reset_session(session_id: str = "default", exercise_type: str = "pushup"):
    """Reset the analyzer for a session (start a new workout)."""
    session_key = f"{session_id}_{exercise_type}"
    if session_key in analyzers:
        del analyzers[session_key]
    return {"status": "ok", "message": "Session reset."}

@app.post("/api/upload-profile-pic", response_model=UploadResponse)
async def upload_profile_pic(file: UploadFile = File(...)):
    """
    Upload a profile picture to Cloudinary.
    Accepts an image file, returns the Cloudinary URL.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image.")

        # Read file contents
        contents = await file.read()

        # Upload to Cloudinary with transformations for profile pics
        result = cloudinary.uploader.upload(
            contents,
            folder="fitness_profiles",
            transformation=[
                {"width": 300, "height": 300, "crop": "fill", "gravity": "face"},
                {"quality": "auto", "fetch_format": "auto"}
            ],
            resource_type="image"
        )

        return UploadResponse(
            url=result["secure_url"],
            public_id=result["public_id"]
        )

    except cloudinary.exceptions.Error as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── WebSocket (kept as fallback for local dev) ─────────────────────────────
@app.websocket("/session/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    analyzer = PushUpAnalyzer()

    try:
        while True:
            data = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            results = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

            rep_count = analyzer.counter
            feedback = analyzer.feedback

            if results.pose_landmarks:
                rep_count, feedback, stage, form_quality, connections = analyzer.analyze(
                    results.pose_landmarks.landmark
                )
            else:
                feedback = "No person detected in frame."
                form_quality = "bad"
                connections = []

            await websocket.send_json({
                "status": "processing",
                "reps": rep_count,
                "feedback": feedback,
                "form_quality": form_quality,
                "connections": connections
            })
    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
