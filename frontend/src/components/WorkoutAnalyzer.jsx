import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { saveSession } from '../db';
import Navbar from './Navbar';
import {
  Play, Pause, Square, Camera, ChevronDown,
  Mic, MicOff, Globe, Zap, Brain, Timer, Target
} from 'lucide-react';
import voiceCoach from '../utils/VoiceCoach';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const EXERCISES = [
  { id: 'pushup', label: 'Push-ups', emoji: '💪', color: '#6C5CE7', tip: 'Position side-on to camera for best tracking' },
  { id: 'squat',  label: 'Squats',   emoji: '🦵', color: '#00B894', tip: 'Face the camera with your full body visible' },
  { id: 'crunch', label: 'Crunches', emoji: '🔥', color: '#FD79A8', tip: 'Position side-on while lying down' },
  { id: 'plank',  label: 'Plank',    emoji: '🧘', color: '#FF9F43', tip: 'Side view — hold a straight line from head to heels' },
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

  const [reps,           setReps]           = useState(0);
  const [feedback,       setFeedback]       = useState('');
  const [exerciseType,   setExerciseType]   = useState('pushup');
  const [isRunning,      setIsRunning]      = useState(false);
  const [sessionId]                         = useState(() => `session_${Date.now()}`);
  const [user,           setUser]           = useState(null);
  const [cameraReady,    setCameraReady]    = useState(false);
  const [cameraStarted,  setCameraStarted]  = useState(false);
  const [cameraLoading,  setCameraLoading]  = useState(false);
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
  const [holdSeconds,    setHoldSeconds]    = useState(0);
  const [goodFormSeconds, setGoodFormSeconds] = useState(0);

  const currentEx = EXERCISES.find(e => e.id === exerciseType) || EXERCISES[0];
  const isPlank = exerciseType === 'plank';

  useEffect(() => {
    voiceCoach.setEnabled(voiceEnabled);
    voiceCoach.setLanguage(voiceLang);
    voiceCoach.setPersona(voicePersona);
  }, [voiceEnabled, voiceLang, voicePersona]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { navigate('/'); return; }
      setUser(u);
      const k = localStorage.getItem('mr_llm_key') || import.meta.env.VITE_GEMINI_API_KEY;
      if (k) setLlmEnabled(true);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    let t;
    if (isRunning) {
      t = setInterval(() => setElapsed(Date.now() - (startTimeRef.current || Date.now())), 1000);
    }
    return () => clearInterval(t);
  }, [isRunning]);

  useEffect(() => {
    startCamera();
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
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setCameraStarted(true);
      }
    } catch {
      setFeedback('Camera access denied. Please allow camera permissions.');
    } finally {
      setCameraLoading(false);
    }
  };

  const captureFrame = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return null;
    c.width = 640; c.height = 480;
    c.getContext('2d').drawImage(v, 0, 0, 640, 480);
    return c.toDataURL('image/jpeg', 0.5).split(',')[1];
  };

  const drawSkeleton = (connections, quality) => {
    const oc = overlayRef.current, v = videoRef.current;
    if (!oc || !v) return;
    const W = v.clientWidth, H = v.clientHeight;
    oc.width = W; oc.height = H;
    const ctx = oc.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (!connections?.length) return;
    const lineColor = quality === 'good' ? '#c6f135' : '#FF6B6B';
    const glow      = quality === 'good' ? 'rgba(198,241,53,0.4)' : 'rgba(255,107,107,0.4)';
    const dotColor  = quality === 'good' ? '#c6f135' : '#FD79A8';
    ctx.strokeStyle = lineColor; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.shadowColor = glow; ctx.shadowBlur = 14;
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
  };

  const lastLlmCall = useRef(0);
  const fetchLlmInsight = async (fb, quality, repCount) => {
    const key = localStorage.getItem('mr_llm_key') || import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || !llmEnabled) return;
    if (Date.now() - lastLlmCall.current < 15000) return;
    lastLlmCall.current = Date.now();
    try {
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
  };

  const analyzeFrame = async () => {
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
        formScoresRef.current.push(data.form_quality === 'good' ? 1 : 0);
        if (data.reps > reps) {
          voiceCoach.motivation(data.reps);
        } else if (data.form_quality !== 'good' && data.feedback !== feedback) {
          voiceCoach.correction(data.feedback);
        }
        setReps(data.reps);
        setFeedback(data.feedback);
        setStage(data.stage);
        setFormQuality(data.form_quality || 'good');
        setHoldSeconds(data.hold_seconds || 0);
        setGoodFormSeconds(data.good_form_seconds || 0);
        drawSkeleton(data.connections || [], data.form_quality || 'good');
        fetchLlmInsight(data.feedback, data.form_quality, data.reps);
      }
    } catch (e) {
      if (!e.message?.includes('Failed to fetch')) console.error('Analysis error:', e);
    } finally { isAnalyzingRef.current = false; }
  };

  const startWorkout = async () => {
    formScoresRef.current = [];
    setHoldSeconds(0);
    setGoodFormSeconds(0);
    if (!cameraStarted) await startCamera();
    setElapsed(0);
    setLlmInsight('');
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(null);
    startTimeRef.current = Date.now();
    setIsRunning(true);
    setFeedback(isPlank ? 'Hold your plank!' : 'Analyzing your form…');
    if (voiceEnabled) voiceCoach.welcome();
    intervalRef.current = setInterval(analyzeFrame, 400);
  };

  const pauseWorkout = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false); setFeedback('Paused');
  };

  const resumeWorkout = () => {
    setIsRunning(true); setFeedback(isPlank ? 'Hold your plank!' : 'Analyzing your form…');
    intervalRef.current = setInterval(analyzeFrame, 400);
  };

  const endWorkout = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    if (user && reps > 0) {
      const mins = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 60000));
      const goodRatio = formScoresRef.current.length > 0
        ? formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length
        : 0.5;
      const score = Math.round(goodRatio * 100);
      await saveSession(user.uid, exerciseType, reps, score, mins, holdSeconds, goodFormSeconds);
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
      <div className="bg-blob" style={{ top: '-80px', right: '-60px', width: 400, height: 400, background: currentEx.color, opacity: 0.1 }} />
      <div className="bg-blob" style={{ bottom: '-60px', left: '-60px', width: 350, height: 350, background: '#c6f135', opacity: 0.06 }} />

      <div className="main-content" style={{ maxWidth: 1000, paddingTop: 80 }}>
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* ── Header ─────────────────────────────────── */}
        <div className="animate-slide-down" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="mr-eyebrow-cine" style={{ marginBottom: 8 }}>
              {isPlank ? 'HOLD EXERCISE' : 'REP EXERCISE'}
            </div>
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: voiceEnabled ? 'var(--volt)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                {voiceEnabled ? <Mic size={17} /> : <MicOff size={17} />}
              </button>

              {voiceEnabled && (
                <>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowLangPicker(!showLangPicker)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink)', fontWeight: 800, fontSize: 13, padding: 0 }}>
                      <Globe size={13} color="var(--ink-dim)" />
                      {LANGUAGES.find(l => l.code === voiceLang)?.label}
                    </button>
                    {showLangPicker && (
                      <div className="mr-card animate-scale-in" style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, minWidth: 140, padding: 8, background: 'var(--panel)', border: '1px solid var(--line)' }}>
                        {LANGUAGES.map(l => (
                          <button key={l.code} onClick={() => { setVoiceLang(l.code); setShowLangPicker(false); setVoicePersona('Auto'); }}
                            style={{
                              display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderRadius: 8, textAlign: 'left',
                              background: voiceLang === l.code ? 'var(--volt-dim)' : 'transparent',
                              color: voiceLang === l.code ? 'var(--volt)' : 'var(--ink)',
                              fontWeight: voiceLang === l.code ? 800 : 600, fontSize: 13, cursor: 'pointer',
                            }}>
                            {l.label} — {l.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8, borderLeft: '1px solid var(--line-strong)' }}>
                    <button onClick={() => setShowPersonaPicker(!showPersonaPicker)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink)', fontWeight: 800, fontSize: 13, padding: 0 }}>
                      <Mic size={13} color="var(--ink-dim)" />
                      {voicePersona}
                    </button>
                    {showPersonaPicker && (
                      <div className="mr-card animate-scale-in" style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, minWidth: 120, padding: 8, background: 'var(--panel)', border: '1px solid var(--line)' }}>
                        {voiceCoach.getAvailablePersonas().map(p => (
                          <button key={p} onClick={() => { setVoicePersona(p); setShowPersonaPicker(false); }}
                            style={{
                              display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderRadius: 8, textAlign: 'left',
                              background: voicePersona === p ? 'var(--volt-dim)' : 'transparent',
                              color: voicePersona === p ? 'var(--volt)' : 'var(--ink)',
                              fontWeight: voicePersona === p ? 800 : 600, fontSize: 13, cursor: 'pointer',
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
              onClick={() => { if (!hasLlmKey) { alert('Add your Gemini API key in Profile first!'); return; } setLlmEnabled(!llmEnabled); }}
              className={`mr-btn ${llmEnabled && hasLlmKey ? 'mr-btn-primary' : 'mr-btn-ghost'}`}
              style={{ padding: '8px 14px', fontSize: 13, border: llmEnabled ? 'none' : '1px solid var(--line-strong)' }}
            >
              <Brain size={15} /> {llmEnabled && hasLlmKey ? 'AI On' : 'AI Off'}
            </button>

            {/* Exercise picker */}
            <div style={{ position: 'relative' }}>
              <button className="mr-btn mr-btn-ghost" onClick={() => setShowExSelect(!showExSelect)}
                disabled={isRunning} id="exercise-select-btn" style={{ minWidth: 155, fontSize: 13, border: '1px solid var(--line-strong)' }}>
                {currentEx.emoji} {currentEx.label} <ChevronDown size={14} />
              </button>
              {showExSelect && (
                <div className="mr-card animate-scale-in" style={{ position: 'absolute', top: '110%', right: 0, marginTop: 4, padding: 8, minWidth: 180, zIndex: 50, background: 'var(--panel)', border: '1px solid var(--line)' }}>
                  {EXERCISES.map(ex => (
                    <button key={ex.id} onClick={() => { setExerciseType(ex.id); setShowExSelect(false); }} id={`select-${ex.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 12px', border: 'none', borderRadius: 10, cursor: 'pointer',
                        background: exerciseType === ex.id ? `${ex.color}15` : 'transparent',
                        color: exerciseType === ex.id ? ex.color : 'var(--ink)',
                        fontWeight: exerciseType === ex.id ? 800 : 600, fontSize: 14,
                        transition: 'all 0.2s'
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
        <div className="mr-card animate-slide-up" style={{ overflow: 'hidden', position: 'relative', borderRadius: 26, aspectRatio: '16/9.5', background: 'var(--panel)', border: '1px solid var(--line)' }}>
          {!cameraStarted ? (
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
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10, fontFamily: "'Outfit', sans-serif", color: 'var(--ink)' }}>
                Ready for {currentEx.label}?
              </h2>
              <p style={{ color: 'var(--ink-dim)', marginBottom: 32, maxWidth: 420, lineHeight: 1.65, fontSize: 15 }}>
                {currentEx.tip}. AI tracks your form in real-time — green skeleton means great form, red means fix it.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="mr-btn mr-btn-primary" onClick={startWorkout}
                  style={{ fontSize: 16, padding: '14px 32px' }} id="start-camera-btn" disabled={cameraLoading}>
                  {cameraLoading ? <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: '#0a0a0d', borderTopColor: 'transparent' }} /> : <Camera size={18} />}
                  {cameraLoading ? 'Starting Camera…' : 'Start Camera & Workout'}
                </button>
                {!hasLlmKey && (
                  <button className="mr-btn mr-btn-ghost" onClick={() => navigate('/profile')}
                    style={{ fontSize: 14, padding: '14px 20px', border: '1px solid var(--line-strong)' }}>
                    <Zap size={15} /> Add AI Key for Insights
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { icon: '📐', text: 'Side view works best' },
                  { icon: '🟢', text: 'Green = perfect form' },
                  { icon: '🔴', text: 'Red = adjust form' },
                  { icon: '🎙️', text: 'Voice coach guides you' },
                ].map((t, i) => (
                  <div key={i} className="chip chip-volt" style={{ gap: 6, padding: '6px 14px' }}>
                    <span>{t.icon}</span><span style={{ fontSize: 12 }}>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
              <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }} />

              {/* Countdown */}
              {countdown !== null && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 10 }}>
                  <div className="animate-scale-in" style={{ fontSize: 130, fontWeight: 900, color: 'var(--volt)', fontFamily: "'Outfit', sans-serif", textShadow: '0 0 80px rgba(198,241,53,0.4)' }}>
                    {countdown}
                  </div>
                </div>
              )}

              {/* HUD — top row */}
              <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 5, pointerEvents: 'none' }}>
                {/* Rep/Hold counter */}
                <div className={`hud-reps ${formQuality === 'good' ? 'good' : 'bad'}`}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
                    {isPlank ? 'Hold Time' : 'Reps'}
                  </p>
                  <p className="animate-count-up" key={isPlank ? holdSeconds : reps} style={{ fontSize: 48, fontWeight: 900, color: 'white', fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
                    {isPlank ? `${holdSeconds}s` : reps}
                  </p>
                </div>

                {/* Timer */}
                {isRunning && (
                  <div className="hud-timer">
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Time</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: "'Outfit', sans-serif" }}>{fmtTime(elapsed)}</p>
                  </div>
                )}

                {/* Feedback */}
                <div className="hud-feedback">
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>Form Coach</p>
                  <p style={{ color: formQuality === 'good' ? '#c6f135' : '#FF6B6B', fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>
                    {feedback || 'Waiting…'}
                  </p>
                </div>
              </div>

              {/* Form quality badge — center top */}
              <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
                <div style={{
                  background: formQuality === 'good' ? 'rgba(198,241,53,0.9)' : 'rgba(255,107,107,0.9)',
                  backdropFilter: 'blur(8px)', borderRadius: 20, padding: '5px 16px',
                  fontWeight: 700, fontSize: 12, color: formQuality === 'good' ? '#0a0a0d' : 'white', letterSpacing: 1.2, textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}>
                  {formQuality === 'good' ? '✓ Good Form' : '✗ Fix Form'}
                </div>
              </div>

              {/* Stage indicator */}
              {isRunning && (
                <div style={{ position: 'absolute', bottom: 76, left: 14, zIndex: 5 }}>
                  <div style={{
                    background: stage === 'down' || stage === 'broken' ? 'rgba(255,107,107,0.75)' : 'rgba(198,241,53,0.75)',
                    backdropFilter: 'blur(8px)', borderRadius: 12, padding: '7px 14px',
                    fontWeight: 700, fontSize: 12, color: stage === 'down' || stage === 'broken' ? 'white' : '#0a0a0d',
                    border: `1px solid ${stage === 'down' || stage === 'broken' ? '#FF6B6B' : '#c6f135'}`,
                    transition: 'all 0.3s ease'
                  }}>
                    {isPlank
                      ? (stage === 'active' ? '🟢 HOLDING' : '🔴 FORM BROKEN')
                      : exerciseType === 'pushup'
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
                  background: 'rgba(198,241,53,0.85)', backdropFilter: 'blur(10px)',
                  borderRadius: 12, padding: '8px 14px',
                  border: '1px solid rgba(198,241,53,0.4)'
                }}>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,13,0.6)', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>🤖 AI COACH</p>
                  <p style={{ color: '#0a0a0d', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{llmInsight}</p>
                </div>
              )}

              {/* Controls — bottom */}
              <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', justifyContent: 'center', gap: 10, zIndex: 5 }}>
                {!isRunning ? (
                  <button onClick={resumeWorkout} disabled={!cameraReady} className="mr-btn mr-btn-primary"
                    id="resume-workout-btn" style={{ pointerEvents: 'auto', padding: '10px 22px' }}>
                    <Play size={16} /> Resume
                  </button>
                ) : (
                  <button onClick={pauseWorkout} className="mr-btn mr-btn-ghost"
                    id="pause-workout-btn" style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.55)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 22px' }}>
                    <Pause size={16} /> Pause
                  </button>
                )}
                <button onClick={endWorkout} className="mr-btn"
                  id="end-workout-btn" style={{ pointerEvents: 'auto', padding: '10px 22px', background: '#FF6B6B', color: '#0a0a0d', border: 'none' }}>
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
                className="mr-card" style={{
                  padding: '18px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: exerciseType === ex.id ? `${ex.color}15` : 'var(--panel)',
                  borderLeft: `4px solid ${exerciseType === ex.id ? ex.color : 'transparent'}`,
                  transition: 'all 0.2s', boxShadow: exerciseType === ex.id ? `0 0 20px ${ex.color}20` : 'none'
                }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>{ex.emoji}</span>
                <p style={{ fontWeight: 800, fontSize: 14, color: exerciseType === ex.id ? ex.color : 'var(--ink)', marginBottom: 3 }}>{ex.label}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-dim)', lineHeight: 1.4 }}>{ex.tip}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
