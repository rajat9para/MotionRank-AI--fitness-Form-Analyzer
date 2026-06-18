import os
import base64
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import cv2
import numpy as np
import mediapipe as mp
import cloudinary
import cloudinary.uploader
from datetime import datetime, timedelta

from dotenv import load_dotenv
load_dotenv()

from database import get_db, close_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Lifespan: MongoDB connect / disconnect ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await get_db()
        logger.info("MongoDB connection established.")
    except Exception as e:
        logger.warning(f"MongoDB not available (startup): {e}. Running without DB.")
    yield
    await close_db()
    logger.info("MongoDB connection closed.")

app = FastAPI(title="MotionRank AI — Fitness Form Analyzer API", lifespan=lifespan)

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

from analyzer import PushUpAnalyzer, SquatAnalyzer, CrunchAnalyzer, PlankAnalyzer

analyzers = {}

# ─── Health Check (keeps Render awake / warm-up ping) ────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "ts": datetime.utcnow().isoformat()}

# ─── Request / Response Models ───────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    frame: str
    exercise_type: str = "pushup"
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
    form_quality: str = "good"
    connections: List[Dict[str, Any]] = []
    hold_seconds: int = 0
    good_form_seconds: int = 0

class UploadResponse(BaseModel):
    url: str
    public_id: str

class SaveWorkoutRequest(BaseModel):
    userId: str
    exerciseType: str
    reps: int = 0
    holdSeconds: int = 0
    goodFormSeconds: int = 0
    formScore: int = 0
    durationMinutes: int = 0

# ─── Core Endpoints ──────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MotionRank AI Backend is running."}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_frame(req: AnalyzeRequest):
    try:
        session_key = f"{req.session_id}_{req.exercise_type}"
        if session_key not in analyzers:
            if req.exercise_type == "squat":
                analyzers[session_key] = SquatAnalyzer()
            elif req.exercise_type == "crunch":
                analyzers[session_key] = CrunchAnalyzer()
            elif req.exercise_type == "plank":
                analyzers[session_key] = PlankAnalyzer()
            else:
                analyzers[session_key] = PushUpAnalyzer()

        analyzer = analyzers[session_key]

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

        hold_seconds = getattr(analyzer, 'hold_seconds', 0)
        good_form_seconds = getattr(analyzer, 'good_form_seconds', 0)

        return AnalyzeResponse(
            status="processing",
            reps=rep_count,
            feedback=feedback,
            stage=stage,
            form_quality=form_quality,
            connections=connections,
            hold_seconds=hold_seconds,
            good_form_seconds=good_form_seconds
        )

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset-session")
async def reset_session(session_id: str = "default", exercise_type: str = "pushup"):
    session_key = f"{session_id}_{exercise_type}"
    if session_key in analyzers:
        del analyzers[session_key]
    return {"status": "ok", "message": "Session reset."}

@app.post("/api/upload-profile-pic", response_model=UploadResponse)
async def upload_profile_pic(file: UploadFile = File(...)):
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image.")

        contents = await file.read()

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

# ─── MongoDB Workout Endpoints ───────────────────────────────────────────────

@app.post("/api/workout/save")
async def save_workout(req: SaveWorkoutRequest):
    try:
        db = await get_db()
        sessions = db["sessions"]
        doc = {
            "userId": req.userId,
            "exerciseType": req.exerciseType,
            "correctReps": req.reps,
            "holdSeconds": req.holdSeconds,
            "goodFormSeconds": req.goodFormSeconds,
            "formScore": req.formScore,
            "durationMinutes": req.durationMinutes,
            "timestamp": datetime.utcnow(),
        }
        result = await sessions.insert_one(doc)

        await _update_user_stats(db, req.userId, req.reps, req.holdSeconds, req.exerciseType, req.durationMinutes)

        return {"status": "ok", "sessionId": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"Save workout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workout/history")
async def get_workout_history(userId: str = Query(...), limit: int = Query(50, ge=1, le=200)):
    try:
        db = await get_db()
        sessions = db["sessions"]
        cursor = sessions.find({"userId": userId}).sort("timestamp", -1).limit(limit)
        results = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if isinstance(doc.get("timestamp"), datetime):
                doc["timestamp"] = doc["timestamp"].isoformat()
            results.append(doc)
        return {"status": "ok", "sessions": results}
    except Exception as e:
        logger.error(f"Get history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workout/records")
async def get_personal_records(userId: str = Query(...)):
    try:
        db = await get_db()
        sessions = db["sessions"]
        pipeline = [
            {"$match": {"userId": userId}},
            {"$group": {
                "_id": "$exerciseType",
                "bestReps": {"$max": "$correctReps"},
                "bestFormScore": {"$max": "$formScore"},
                "bestHoldSeconds": {"$max": "$holdSeconds"},
                "totalSessions": {"$sum": 1},
            }}
        ]
        results = []
        async for doc in sessions.aggregate(pipeline):
            doc["_id"] = str(doc["_id"])
            results.append(doc)
        return {"status": "ok", "records": results}
    except Exception as e:
        logger.error(f"Get records error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workout/stats")
async def get_workout_stats(userId: str = Query(...)):
    try:
        db = await get_db()
        sessions = db["sessions"]
        pipeline = [
            {"$match": {"userId": userId}},
            {"$group": {
                "_id": None,
                "totalSessions": {"$sum": 1},
                "totalReps": {"$sum": "$correctReps"},
                "totalMinutes": {"$sum": "$durationMinutes"},
                "avgFormScore": {"$avg": "$formScore"},
            }}
        ]
        result = None
        async for doc in sessions.aggregate(pipeline):
            result = doc

        stats = {
            "totalSessions": 0,
            "totalReps": 0,
            "totalMinutes": 0,
            "avgFormScore": 0,
        }
        if result:
            stats["totalSessions"] = result.get("totalSessions", 0)
            stats["totalReps"] = result.get("totalReps", 0)
            stats["totalMinutes"] = result.get("totalMinutes", 0)
            stats["avgFormScore"] = round(result.get("avgFormScore", 0) or 0, 1)

        return {"status": "ok", "stats": stats}
    except Exception as e:
        logger.error(f"Get stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workout/leaderboard")
async def get_leaderboard(limit: int = Query(50, ge=1, le=100)):
    try:
        db = await get_db()
        sessions = db["sessions"]
        pipeline = [
            {"$group": {
                "_id": "$userId",
                "totalReps": {"$sum": "$correctReps"},
                "totalSessions": {"$sum": 1},
                "totalMinutes": {"$sum": "$durationMinutes"},
            }},
            {"$sort": {"totalReps": -1}},
            {"$limit": limit}
        ]
        results = []
        async for doc in sessions.aggregate(pipeline):
            results.append({
                "userId": doc["_id"],
                "totalReps": doc["totalReps"],
                "totalSessions": doc["totalSessions"],
                "totalMinutes": doc["totalMinutes"],
            })
        return {"status": "ok", "leaderboard": results}
    except Exception as e:
        logger.error(f"Get leaderboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workout/exercise-distribution")
async def get_exercise_distribution(userId: str = Query(...)):
    try:
        db = await get_db()
        sessions = db["sessions"]
        twelve_months_ago = datetime.utcnow() - timedelta(days=365)
        pipeline = [
            {"$match": {"userId": userId, "timestamp": {"$gte": twelve_months_ago}}},
            {"$group": {
                "_id": "$exerciseType",
                "totalReps": {"$sum": "$correctReps"},
            }}
        ]
        dist = {"pushup": 0, "squat": 0, "crunch": 0, "plank": 0}
        async for doc in sessions.aggregate(pipeline):
            ex = doc["_id"]
            if ex in dist:
                dist[ex] = doc.get("totalReps", 0)

        return {"status": "ok", "distribution": dist}
    except Exception as e:
        logger.error(f"Get distribution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _update_user_stats(db, user_id, reps, hold_seconds, exercise_type, duration_minutes):
    try:
        users = db["users"]
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        user_doc = await users.find_one({"_id": user_id})
        if not user_doc:
            await users.insert_one({
                "_id": user_id,
                "totalReps": 0,
                "totalMinutes": 0,
                "currentStreak": 0,
                "longestStreak": 0,
                "lastWorkoutDate": None,
                "updatedAt": now,
            })
            user_doc = await users.find_one({"_id": user_id})

        last_workout = user_doc.get("lastWorkoutDate")
        new_streak = user_doc.get("currentStreak", 0) or 0

        if last_workout:
            if isinstance(last_workout, datetime):
                last_day = last_workout.replace(hour=0, minute=0, second=0, microsecond=0)
                diff_days = (today - last_day).days
                if diff_days == 0:
                    pass
                elif diff_days == 1:
                    new_streak += 1
                else:
                    new_streak = 1
        else:
            new_streak = 1

        stat_reps = hold_seconds if exercise_type == "plank" else reps
        longest = max(new_streak, user_doc.get("longestStreak", 0) or 0)

        await users.update_one(
            {"_id": user_id},
            {"$set": {
                "totalReps": (user_doc.get("totalReps", 0) or 0) + stat_reps,
                "totalMinutes": (user_doc.get("totalMinutes", 0) or 0) + duration_minutes,
                "currentStreak": new_streak,
                "longestStreak": longest,
                "lastWorkoutDate": now,
                "updatedAt": now,
            }}
        )
    except Exception as e:
        logger.error(f"Update user stats error: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
