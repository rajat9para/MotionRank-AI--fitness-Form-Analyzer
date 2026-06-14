import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { saveSession, getUserSessions } from '../db';
import Navbar from './Navbar';
import {
  Play, Pause, Square, Camera, ChevronDown,
  Mic, MicOff, Globe, Zap, Brain
} from 'lucide-react';
import voiceCoach from '../utils/VoiceCoach';
import { useToast } from '../ToastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const EXERCISES = [
  { id: 'pushup', label: 'Push-ups', emoji: '💪', color: '#6C5CE7', tip: 'Position side-on to camera for best tracking' },
  { id: 'squat',  label: 'Squats',   emoji: '🦵', color: '#00B894', tip: 'Face the camera with your full body visible' },
  { id: 'crunch', label: 'Crunches', emoji: '🔥', color: '#FD79A8', tip: 'Position side-on while lying down' },
];

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'hi', label: 'HI', name: 'Hindi' },
  { code: 'fr', label: 'FR', name: 'French' },
  { code: 'es', label: 'ES', name: 'Spanish' },
  { code: 'pa', label: 'PA', name: 'Punjabi' },
  { code: 'de', label: 'DE', name: 'German' },
];

export default function WorkoutAnalyzer() {
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const overlayRef     = useRef(null);
  const intervalRef    = useRef(null);
  const startTimeRef   = useRef(null);
  const isAnalyzingRef = useRef(false);
  const formScoresRef  = useRef([]);
  const navigate       = useNavigate();
  const { addToast }   = useToast();

  const [reps,           setReps]           = useState(0);
  const [feedback,       setFeedback]       = useState('');
  const [exerciseType,   setExerciseType]   = useState('pushup');
  const [isRunning,      setIsRunning]      = useState(false);
  const [sessionId]                         = useState(() => `session_${Date.now()}`);
  const [user,           setUser]           = useState(null);
  const [cameraReady,    setCameraReady]    = useState(false);
  const [cameraStarted,  setCameraStarted]  = useState(false);
  const [stage,          setStage]          = useState('up');
  const [formQuality,    setFormQuality]    = useState('good');
  const [countdown,      setCountdown]      = useState(null);
  const [showExSelect,   setShowExSelect]   = useState(false);
  const [voiceEnabled,   setVoiceEnabled]   = useState(true);
  const [voiceLang,      setVoiceLang]      = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [voicePersona,   setVoicePersona]   = useState('Auto');
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [llmEnabled,     setLlmEnabled]     = useState(false);
  const [llmInsight,     setLlmInsight]     = useState('');
  const [elapsed,        setElapsed]        = useState(0);
  const [pastSessions,   setPastSessions]   = useState([]);

  const currentEx = EXERCISES.find(e => e.id === exerciseType) || EXERCISES[0];

  // Target reps = most recent prior session for this exercise (fallback 10).
  const targetReps = useMemo(() => {
    const last = pastSessions.find(s => s.exerciseType === exerciseType);
    return last?.correctReps > 0 ? last.correctReps : 10;
  }, [pastSessions, exerciseType]);

  const progressPct = Math.min(100, Math.round((reps / targetReps) * 100));

  // Sync voice coach
  useEffect(() => {
    voiceCoach.setEnabled(voiceEnabled);
    voiceCoach.setLanguage(voiceLang);
    voiceCoach.setPersona(voicePersona);
  }, [voiceEnabled, voiceLang, voicePersona]);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate('/'); return; }
      setUser(u);
      // Check if user has an LLM key configured
      const k = localStorage.getItem('mr_llm_key') || import.meta.env.VITE_GEMINI_API_KEY;
      if (k) setLlmEnabled(true);
      // Load prior sessions to set a rep goal for the progress bar.
      try {
        const sessions = await getUserSessions(u.uid);
        setPastSessions(sessions || []);
      } catch (e) { console.warn('Could not load past sessions:', e); }
    });
    return () => unsub();
  }, [navigate]);

  // Timer
  useEffect(() => {
    let t;
    if (isRunning) {
      t = setInterval(() => setElapsed(Date.now() - (startTimeRef.current || Date.now())), 1000);
    }
    return () => clearInterval(t);
  }, [isRunning]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    const v = videoRef.current;
    if (v?.srcObject) { v.srcObject.getTracks().forEach(t => t.stop()); v.srcObject = null; }
    setCameraReady(false); setCameraStarted(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setCameraReady(true); setCameraStarted(true); }
    } catch {
      setFeedback('Camera access denied. Please allow camera permissions.');
    }
  };

  const captureFrame = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return null;
    c.width = 640; c.height = 480;
    c.getContext('2d').drawImage(v, 0, 0, 640, 480);
    return c.toDataURL('image/jpeg', 0.5).split(',')[1];
  }, []);

  const drawSkeleton = useCallback((connections, quality) => {
    const oc = overlayRef.current, v = videoRef.current;
    if (!oc || !v) return;
    const W = v.clientWidth, H = v.clientHeight;
    oc.width = W; oc.height = H;
    const ctx = oc.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (!connections?.length) return;
    const lineColor = quality === 'good' ? '#00B894' : '#FF6B6B';
    const glow      = quality === 'good' ? 'rgba(0,184,148,0.4)' : 'rgba(255,107,107,0.4)';
    const dotColor  = quality === 'good' ? '#00CEC9' : '#FD79A8';
    ctx.strokeStyle = lineColor; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.shadowColor = glow; ctx.shadowBlur = 10;
    connections.forEach(({ start, end }) => {
      if (!start || !end) return;
      ctx.beginPath();
      ctx.moveTo((1 - start.x) * W, start.y * H);
      ctx.lineTo((1 - end.x) * W, end.y * H);
      ctx.stroke();
    });
    ctx.shadowBlur = 0; ctx.fillStyle = dotColor;
    const drawn = new Set();
    connections.forEach(({ start, end }) => {
      [start, end].forEach(p => {
        if (!p) return;
        const key = `${p.x},${p.y}`;
        if (drawn.has(key)) return; drawn.add(key);
        const px = (1 - p.x) * W, py = p.y * H;
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
      });
    });
  }, []);

  // LLM insight fetch (throttled — every ~15s)
  const lastLlmCall = useRef(0);
  const fetchLlmInsight = useCallback(async (fb, quality, repCount) => {
    const key = localStorage.getItem('mr_llm_key') || import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || !llmEnabled) return;
    if (Date.now() - lastLlmCall.current < 15000) return;
    lastLlmCall.current = Date.now();
    try {
      // Call Gemini generative language API
      const prompt = `You are a world-class fitness coach. A user is doing ${exerciseType}. 
Current reps: ${repCount}. Form feedback from sensor: "${fb}". Form quality: ${quality}.
Give ONE short, punchy coaching sentence (max 12 words) — either a correction, motivation, or tip.
Be direct, energetic, like a real coach. No intro, just the sentence.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 60, temperature: 0.8 }
          })
        }
      );
      if (res.ok) {
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          setLlmInsight(text);
          if (voiceEnabled) voiceCoach.speak(text, true);
        }
      }
    } catch (e) {
      console.warn('LLM insight failed:', e);
    }
  }, [llmEnabled, exerciseType, voiceEnabled]);

  const analyzeFrame = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    const frame = captureFrame();
    if (!frame) return;
    isAnalyzingRef.current = true;
    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame, exercise_type: exerciseType, session_id: sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reps > reps) {
          voiceCoach.motivation(data.reps);
        } else if (data.form_quality !== 'good' && data.feedback !== feedback) {
          voiceCoach.correction(data.feedback);
        }
        setReps(data.reps);
        setFeedback(data.feedback);
        setStage(data.stage);
        setFormQuality(data.form_quality || 'good');
        formScoresRef.current.push(data.form_quality === 'good' ? 1 : 0);
        drawSkeleton(data.connections || [], data.form_quality || 'good');
        // Fetch LLM insight periodically
        fetchLlmInsight(data.feedback, data.form_quality, data.reps);
      }
    } catch (e) {
      if (!e.message?.includes('Failed to fetch')) console.error('Analysis error:', e);
    } finally { isAnalyzingRef.current = false; }
  }, [captureFrame, exerciseType, sessionId, drawSkeleton, reps, feedback, fetchLlmInsight]);

  const startWorkout = async () => {
    if (!cameraStarted) {
      await startCamera();
      // Wait for the video element to actually receive frames
      const v = videoRef.current;
      if (v) {
        await new Promise((resolve) => {
          const check = () => {
            if (v.readyState >= 2) resolve();
            else setTimeout(check, 100);
          };
          check();
        });
      }
    }
    setReps(0);
    setElapsed(0);
    setLlmInsight('');
    setFeedback('');
    formScoresRef.current = [];
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(null);
    startTimeRef.current = Date.now();
    setIsRunning(true);
    setFeedback('Analyzing your form…');
    if (voiceEnabled) voiceCoach.welcome();
    intervalRef.current = setInterval(analyzeFrame, 400);
  };

  const pauseWorkout = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false); setFeedback('Paused');
  };

  const resumeWorkout = () => {
    setIsRunning(true); setFeedback('Analyzing your form…');
    intervalRef.current = setInterval(analyzeFrame, 400);
  };

  const endWorkout = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    if (voiceEnabled) voiceCoach.sessionEnd(reps);
    if (user && reps > 0) {
      const mins = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 60000));
      const samples = formScoresRef.current;
      const goodRatio = samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0.5;
      // Real form score derived from tracked good/bad samples (40–100 range).
      const score = Math.round(40 + goodRatio * 60);
      await saveSession(user.uid, exerciseType, reps, score, mins);
    }
    try { await fetch(`${API_URL}/api/reset-session?session_id=${sessionId}&exercise_type=${exerciseType}`, { method: 'POST' }); } catch {}
    stopCamera();
    navigate('/dashboard');
  };

  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const hasLlmKey = !!(localStorage.getItem('mr_llm_key') || import.meta.env.VITE_GEMINI_API_KEY);

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="bg-blob" style={{ top: '-80px', right: '-60px',  width: 400, height: 400, background: currentEx.color, opacity: 0.12 }} />
      <div className="bg-blob" style={{ bottom: '-60px', left: '-60px', width: 350, height: 350, background: '#6C5CE7', opacity: 0.08 }} />

      <div className="main-content" style={{ maxWidth: 1000, paddingTop: 80 }}>
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* ── Header ─────────────────────────────────── */}
        <div className="animate-slide-down" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 32 }}>{currentEx.emoji}</span>
              <h1 style={{ fontSize: 30, fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>Live Workout</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{currentEx.tip}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Voice Coach pill */}
            <div className="voice-coach-pill" style={{ position: 'relative' }}>
              {voiceEnabled && <div className="voice-active-indicator" />}
              <button onClick={() => setVoiceEnabled(!voiceEnabled)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: voiceEnabled ? 'var(--accent-pink)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                title={voiceEnabled ? 'Disable voice coach' : 'Enable voice coach'}>
                {voiceEnabled ? <Mic size={17} /> : <MicOff size={17} />}
              </button>

              {voiceEnabled && (
                <>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowLangPicker(!showLangPicker)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)', fontWeight: 700, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: 0 }}>
                      <Globe size={13} color="var(--text-muted)" />
                      {LANGUAGES.find(l => l.code === voiceLang)?.label}
                    </button>
                    {showLangPicker && (
                      <div className="glass-card-strong animate-scale-in" style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, minWidth: 140, padding: 8 }}>
                        {LANGUAGES.map(l => (
                          <button key={l.code} onClick={() => { setVoiceLang(l.code); setShowLangPicker(false); setVoicePersona('Auto'); }}
                            style={{
                              display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderRadius: 8, textAlign: 'left',
                              background: voiceLang === l.code ? 'rgba(108,92,231,0.12)' : 'transparent',
                              color: voiceLang === l.code ? 'var(--primary)' : 'var(--text-primary)',
                              fontWeight: voiceLang === l.code ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif"
                            }}>
                            {l.label} — {l.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8, borderLeft: '1px solid var(--border-color)' }}>
                    <button onClick={() => setShowPersonaPicker(!showPersonaPicker)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)', fontWeight: 700, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: 0 }}>
                      <Mic size={13} color="var(--text-muted)" />
                      {voicePersona}
                    </button>
                    {showPersonaPicker && (
                      <div className="glass-card-strong animate-scale-in" style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, minWidth: 120, padding: 8 }}>
                        {voiceCoach.getAvailablePersonas().map(p => (
                          <button key={p} onClick={() => { setVoicePersona(p); setShowPersonaPicker(false); }}
                            style={{
                              display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderRadius: 8, textAlign: 'left',
                              background: voicePersona === p ? 'rgba(108,92,231,0.12)' : 'transparent',
                              color: voicePersona === p ? 'var(--primary)' : 'var(--text-primary)',
                              fontWeight: voicePersona === p ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif"
                            }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              </div>

            {/* LLM toggle */}
            <button
              onClick={() => { if (!hasLlmKey) { addToast('Add your Gemini API key in Profile → LLM API Key first!', 'warning'); return; } setLlmEnabled(!llmEnabled); }}
              className={`btn-skeu ${llmEnabled && hasLlmKey ? 'btn-skeu-primary' : 'btn-skeu-secondary'}`}
              style={{ padding: '8px 14px', fontSize: 13 }}
              title={hasLlmKey ? 'Toggle AI coach insights' : 'Add API key in Profile first'}
            >
              <Brain size={15} /> {llmEnabled && hasLlmKey ? 'AI On' : 'AI Off'}
            </button>

            {/* Exercise picker */}
            <div style={{ position: 'relative' }}>
              <button className="btn-skeu btn-skeu-secondary" onClick={() => setShowExSelect(!showExSelect)}
                disabled={isRunning} id="exercise-select-btn" style={{ minWidth: 155, fontSize: 13 }}>
                {currentEx.emoji} {currentEx.label} <ChevronDown size={14} />
              </button>
              {showExSelect && (
                <div className="glass-card-strong animate-scale-in" style={{ position: 'absolute', top: '110%', right: 0, marginTop: 4, padding: 8, minWidth: 180, zIndex: 50 }}>
                  {EXERCISES.map(ex => (
                    <button key={ex.id} onClick={() => { setExerciseType(ex.id); setShowExSelect(false); }} id={`select-${ex.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 12px', border: 'none', borderRadius: 10, cursor: 'pointer',
                        background: exerciseType === ex.id ? `${ex.color}12` : 'transparent',
                        color: exerciseType === ex.id ? ex.color : 'var(--text-primary)',
                        fontWeight: exerciseType === ex.id ? 700 : 500, fontSize: 14,
                        fontFamily: "'Inter', sans-serif", transition: 'all 0.2s'
                      }}>
                      <span style={{ fontSize: 20 }}>{ex.emoji}</span> {ex.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Camera / Video Area ─────────────────────── */}
        <div className="glass-card-strong animate-slide-up" style={{ overflow: 'hidden', position: 'relative', borderRadius: 26, aspectRatio: '16/9.5', background: 'var(--bg-secondary)' }}>
          {!cameraStarted ? (
            /* ── Camera Start Screen ─── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 380, padding: 40, textAlign: 'center' }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%', marginBottom: 28,
                background: `linear-gradient(135deg, ${currentEx.color}25, ${currentEx.color}08)`,
                border: `2px solid ${currentEx.color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'glow 2s ease-in-out infinite',
                boxShadow: `0 0 30px ${currentEx.color}20`
              }}>
                <Camera size={38} color={currentEx.color} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10, fontFamily: "'Outfit', sans-serif" }}>
                Ready for {currentEx.label}?
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 32, maxWidth: 420, lineHeight: 1.65, fontSize: 15 }}>
                {currentEx.tip}. AI tracks your form in real-time — green skeleton means great form, red means fix it.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn-skeu btn-skeu-success" onClick={startWorkout}
                  style={{ fontSize: 16, padding: '14px 32px' }} id="start-camera-btn">
                  <Camera size={18} /> Start Camera & Workout
                </button>
                {!hasLlmKey && (
                  <button className="btn-skeu btn-skeu-secondary" onClick={() => navigate('/profile')}
                    style={{ fontSize: 14, padding: '14px 20px' }}>
                    <Zap size={15} /> Add AI Key for Insights
                  </button>
                )}
              </div>

              {/* Tips row */}
              <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { icon: '📐', text: 'Side view works best' },
                  { icon: '🟢', text: 'Green = perfect form' },
                  { icon: '🔴', text: 'Red = adjust form' },
                  { icon: '🎙️', text: 'Voice coach guides you' },
                ].map((t, i) => (
                  <div key={i} className="chip" style={{ gap: 6, padding: '6px 14px' }}>
                    <span>{t.icon}</span><span style={{ fontSize: 12 }}>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Video */}
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />

              {/* Skeleton overlay */}
              <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }} />

              {/* Countdown */}
              {countdown !== null && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 10 }}>
                  <div className="animate-scale-in" style={{ fontSize: 130, fontWeight: 900, color: 'white', fontFamily: "'Outfit', sans-serif", textShadow: `0 0 80px ${currentEx.color}` }}>
                    {countdown}
                  </div>
                </div>
              )}

              {/* HUD — top row */}
              <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 5, pointerEvents: 'none' }}>
                {/* Rep counter */}
                <div style={{
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(14px)', borderRadius: 18,
                  padding: '10px 18px', border: `2px solid ${formQuality === 'good' ? '#00B894' : '#FF6B6B'}`, transition: 'border-color 0.3s'
                }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Reps</p>
                  <p className="animate-count-up" key={reps} style={{ fontSize: 52, fontWeight: 900, color: 'white', fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{reps}</p>
                </div>

                {/* Timer */}
                {isRunning && (
                  <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', borderRadius: 14, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Time</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Outfit', sans-serif" }}>{fmtTime(elapsed)}</p>
                  </div>
                )}

                {/* Feedback */}
                <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '10px 16px', maxWidth: 260, border: '1px solid rgba(255,255,255,0.12)' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>Form Coach</p>
                  <p style={{ color: formQuality === 'good' ? '#00B894' : '#FF6B6B', fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>
                    {feedback || 'Waiting…'}
                  </p>
                </div>
              </div>

              {/* Form quality badge — center top */}
              <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
                <div style={{
                  background: formQuality === 'good' ? 'rgba(0,184,148,0.85)' : 'rgba(255,107,107,0.85)',
                  backdropFilter: 'blur(8px)', borderRadius: 20, padding: '5px 16px',
                  fontWeight: 700, fontSize: 12, color: 'white', letterSpacing: 1.2, textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}>
                  {formQuality === 'good' ? '✓ Good Form' : '✗ Fix Form'}
                </div>
              </div>

              {/* Stage indicator */}
              {isRunning && (
                <div style={{ position: 'absolute', bottom: 76, left: 14, zIndex: 5 }}>
                  <div style={{
                    background: stage === 'down' ? 'rgba(253,121,168,0.75)' : 'rgba(0,184,148,0.75)',
                    backdropFilter: 'blur(8px)', borderRadius: 12, padding: '7px 14px',
                    fontWeight: 700, fontSize: 12, color: 'white',
                    border: `1px solid ${stage === 'down' ? '#FD79A8' : '#00B894'}`,
                    transition: 'all 0.3s ease'
                  }}>
                    {exerciseType === 'pushup'
                      ? (stage === 'down' ? '⬇ DOWN' : '⬆ UP')
                      : exerciseType === 'squat'
                        ? (stage === 'down' ? '⬇ SQUAT' : '⬆ STAND')
                        : (stage === 'up' ? '⬆ CRUNCH' : '⬇ DOWN')}
                  </div>
                </div>
              )}

              {/* LLM insight banner */}
              {llmInsight && llmEnabled && (
                <div className="animate-slide-up" style={{
                  position: 'absolute', bottom: 76, right: 14, left: 160, zIndex: 5,
                  background: 'rgba(108,92,231,0.8)', backdropFilter: 'blur(10px)',
                  borderRadius: 12, padding: '8px 14px',
                  border: '1px solid rgba(162,155,254,0.4)'
                }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>🤖 AI COACH</p>
                  <p style={{ color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{llmInsight}</p>
                </div>
              )}

              {/* Controls — bottom */}
              <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', justifyContent: 'center', gap: 10, zIndex: 5 }}>
                {!isRunning ? (
                  <button onClick={resumeWorkout} disabled={!cameraReady} className="btn-skeu btn-skeu-success"
                    id="resume-workout-btn" style={{ pointerEvents: 'auto', padding: '10px 22px' }}>
                    <Play size={16} /> Resume
                  </button>
                ) : (
                  <button onClick={pauseWorkout} className="btn-skeu btn-skeu-secondary"
                    id="pause-workout-btn" style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.55)', color: 'white', borderColor: 'rgba(255,255,255,0.2)', padding: '10px 22px' }}>
                    <Pause size={16} /> Pause
                  </button>
                )}
                <button onClick={endWorkout} className="btn-skeu btn-skeu-danger"
                  id="end-workout-btn" style={{ pointerEvents: 'auto', padding: '10px 22px' }}>
                  <Square size={16} /> End Workout
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Exercise tips row (only before start) ── */}
        {!cameraStarted && (
          <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
            {EXERCISES.map(ex => (
              <button key={ex.id} onClick={() => setExerciseType(ex.id)}
                className="glass-card" style={{
                  padding: '18px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderLeft: `4px solid ${exerciseType === ex.id ? ex.color : 'transparent'}`,
                  transition: 'all 0.2s'
                }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>{ex.emoji}</span>
                <p style={{ fontWeight: 800, fontSize: 14, color: exerciseType === ex.id ? ex.color : 'var(--text-primary)', marginBottom: 3 }}>{ex.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{ex.tip}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
