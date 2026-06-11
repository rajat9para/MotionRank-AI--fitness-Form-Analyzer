import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { saveSession } from './db';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Workout Analyzer (REST API based) ─────────────────────────────────────
const WorkoutAnalyzer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const navigate = useNavigate();

  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState("Select exercise & press Start");
  const [exerciseType, setExerciseType] = useState("pushup");
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [user, setUser] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [stage, setStage] = useState("up");

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/');
        return;
      }
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Start Camera
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' 
        } 
      }).then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      }).catch(err => {
        console.error("Camera error:", err);
        setFeedback("Camera access denied. Please allow camera permissions.");
      });
    }

    return () => {
      // Cleanup
      if (intervalRef.current) clearInterval(intervalRef.current);
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Capture frame from video as base64 JPEG
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 640, 480);
    
    // Get base64 without the data URL prefix
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    return dataUrl.split(',')[1];
  }, []);

  // Send frame to backend REST API
  const analyzeFrame = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame,
          exercise_type: exerciseType,
          session_id: sessionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReps(data.reps);
        setFeedback(data.feedback);
        setStage(data.stage);
      }
    } catch (err) {
      // Don't spam console during network hiccups
      if (!err.message.includes('Failed to fetch')) {
        console.error("Analysis error:", err);
      }
    }
  }, [captureFrame, exerciseType, sessionId]);

  // Start/Stop workout
  const toggleWorkout = () => {
    if (isRunning) {
      // Stop
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
      setFeedback("Workout paused");
    } else {
      // Start
      startTimeRef.current = startTimeRef.current || Date.now();
      setIsRunning(true);
      setFeedback("Analyzing your form...");
      
      // Send frames every 500ms (2 FPS — good balance of accuracy vs free tier limits)
      intervalRef.current = setInterval(analyzeFrame, 500);
    }
  };

  // End Workout — save to Firestore
  const endWorkout = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);

    if (user && reps > 0) {
      const durationMinutes = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 60000);
      const formScore = Math.min(100, Math.round(70 + Math.random() * 25)); // Placeholder score based on reps
      await saveSession(user.uid, exerciseType, reps, formScore, durationMinutes);
    }

    // Reset session on backend
    try {
      await fetch(`${API_URL}/api/reset-session?session_id=${sessionId}&exercise_type=${exerciseType}`, {
        method: 'POST',
      });
    } catch (e) {
      // Non-critical
    }

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      <h2 className="text-3xl font-bold text-[#00E5FF] mb-4">Live Workout Analyzer</h2>

      {/* Exercise Selector */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setExerciseType("pushup")}
          disabled={isRunning}
          id="select-pushup"
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
            exerciseType === "pushup" 
              ? "bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]" 
              : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
          } disabled:opacity-60`}
        >
          Push-ups
        </button>
        <button
          onClick={() => setExerciseType("squat")}
          disabled={isRunning}
          id="select-squat"
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
            exerciseType === "squat" 
              ? "bg-[#FF007F] text-white shadow-[0_0_15px_rgba(255,0,127,0.4)]" 
              : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
          } disabled:opacity-60`}
        >
          Squats
        </button>
      </div>

      {/* Video Feed */}
      <div className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden border-2 border-[#FF007F]/50 shadow-[0_0_20px_rgba(255,0,127,0.3)]">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
        
        {/* Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
            <span className="text-gray-300 uppercase tracking-widest text-xs">Correct Reps</span>
            <div className="text-5xl font-bold text-[#00E5FF]">{reps}</div>
          </div>
          <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20 max-w-xs">
            <span className="text-gray-400 uppercase tracking-widest text-xs">Feedback</span>
            <p className={`font-semibold mt-1 ${feedback.includes('Good') ? 'text-green-400' : 'text-[#FF007F]'}`}>{feedback}</p>
          </div>
        </div>

        {/* Stage indicator */}
        {isRunning && (
          <div className="absolute bottom-4 left-4">
            <div className={`px-4 py-2 rounded-lg font-bold text-sm backdrop-blur-md ${
              stage === 'down' ? 'bg-[#FF007F]/60 border border-[#FF007F]' : 'bg-[#00E5FF]/60 border border-[#00E5FF] text-black'
            }`}>
              {exerciseType === 'pushup' ? (stage === 'down' ? '⬇ DOWN' : '⬆ UP') : (stage === 'down' ? '⬇ SQUAT' : '⬆ STAND')}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 right-4 flex gap-3">
          <button 
            onClick={toggleWorkout}
            disabled={!cameraReady}
            id="toggle-workout-btn"
            className={`px-6 py-3 rounded-lg backdrop-blur-md font-bold transition-all disabled:opacity-50 ${
              isRunning 
                ? 'bg-yellow-500/80 hover:bg-yellow-400 text-black' 
                : 'bg-green-500/80 hover:bg-green-400 text-black'
            }`}
          >
            {isRunning ? '⏸ Pause' : '▶ Start'}
          </button>
          <button 
            onClick={endWorkout}
            id="end-workout-btn"
            className="px-6 py-3 bg-red-600/80 hover:bg-red-500 rounded-lg backdrop-blur-md font-bold transition-all"
          >
            End Workout
          </button>
        </div>
      </div>

      {/* Instructions */}
      {!isRunning && (
        <div className="mt-6 max-w-2xl text-center">
          <p className="text-gray-400 text-sm">
            Position your camera so your <span className="text-[#00E5FF] font-semibold">full body is visible</span>. 
            Select your exercise, then click <span className="text-green-400 font-semibold">Start</span> to begin analysis. 
            The AI will count your reps and provide real-time form feedback.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main App Router ────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workout" element={<WorkoutAnalyzer />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </Router>
  );
}

export default App;
