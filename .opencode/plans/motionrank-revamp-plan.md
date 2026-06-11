# MotionRank AI — Complete Revamp Plan

## Config Values (from user)

### Firebase
```
VITE_FIREBASE_API_KEY=AIzaSyBnGhk6O-wvIMsaxOiJo68q7n4M32FjSkk
VITE_FIREBASE_AUTH_DOMAIN=ai-fitness-form-analyzer.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-fitness-form-analyzer
VITE_FIREBASE_STORAGE_BUCKET=ai-fitness-form-analyzer.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=858391480541
VITE_FIREBASE_APP_ID=1:858391480541:web:680d93ecd355dd498ff334
```

### Cloudinary
```
CLOUDINARY_CLOUD_NAME=dmanesip5
CLOUDINARY_API_KEY=***
CLOUDINARY_API_SECRET=***
```

### Gemini API Key
```
VITE_GEMINI_API_KEY=***
```

---

## Execution Order

### 🔴 Phase 1 — Critical Fixes

#### Step 1: Fix frontend `.env`
**File:** `frontend/.env`
**Action:** Write the full config with Firebase + Cloudinary + Gemini key

```
VITE_FIREBASE_API_KEY=AIzaSyBnGhk6O-wvIMsaxOiJo68q7n4M32FjSkk
VITE_FIREBASE_AUTH_DOMAIN=ai-fitness-form-analyzer.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-fitness-form-analyzer
VITE_FIREBASE_STORAGE_BUCKET=ai-fitness-form-analyzer.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=858391480541
VITE_FIREBASE_APP_ID=1:858391480541:web:680d93ecd355dd498ff334
VITE_API_URL=http://localhost:8000
VITE_CLOUDINARY_CLOUD_NAME=dmanesip5
VITE_CLOUDINARY_UPLOAD_PRESET=ml_default
VITE_GEMINI_API_KEY=***
```

#### Step 2: Create backend `.env`
**File:** `backend/.env`
**Action:** Write Cloudinary config + frontend URL for CORS

```
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=dmanesip5
CLOUDINARY_API_KEY=***
CLOUDINARY_API_SECRET=***
```

---

### 🟠 Phase 2 — Bug Fixes

#### Step 3: Fix `analyzer.py` typo
**File:** `backend/analyzer.py` line 3
**Old:** `# pyrefly: ignore [missing-import]`
**New:** Remove the comment entirely (unnecessary)

#### Step 4: Fix Auth responsive bug
**File:** `frontend/src/components/Auth.jsx`
**Problem:** The left panel `<div>` on line 98 doesn't have the `auth-left` class, so the `@media` query on line 250-252 that hides `.auth-left` on small screens never fires.
**Fix:** Add `className="auth-left"` to the left panel div (line ~98).
**Also fix:** The `@media` query uses `.auth-left` which is a CSS class selector but there's no corresponding CSS class defined. Either:
  - Add the class to the JSX: `className="auth-left"` on the div
  - OR change the media query to target it differently
  - Add a `.auth-left { }` class or just use the existing approach

#### Step 5: Remove duplicate `slideDown` keyframe
**File:** `frontend/src/index.css`
**Problem:** Two `@keyframes slideDown` definitions:
  - Line 279: `from { opacity: 0; transform: translateY(-10px); }` — used in navbar mobile menu
  - Line 437: `from { opacity: 0; transform: translateY(-16px); }` — used for `.animate-slide-down`
**Fix:** Remove the first one (lines 279-282). Update the navbar mobile menu to use `.animate-slide-down` class instead.

#### Step 6: Fix Crunch analyzer initial stage
**File:** `backend/analyzer.py`, `CrunchAnalyzer.__init__` (line 313)
**Problem:** `self.stage = "down"` — Rep counting at line 356 only fires when `stage == "up"` AND `torso_angle > 140`. Since it starts as `"down"`, the first rep is never counted until the user goes down→up→down→up.
**Fix:** Change initial stage to `"up"` so the first `torso_angle > 140` (lying flat) triggers a rep count correctly. Also update the initial feedback.

#### Step 7: Replace random form score with real tracking
**File:** `frontend/src/components/WorkoutAnalyzer.jsx`
**Problem:** Lines 254-255: `const score = formQuality === 'good' ? Math.min(100, 80 + Math.round(Math.random() * 15)) : 50 + Math.round(Math.random() * 20);` — score is random.
**Fix:** Track form quality samples during the workout session. Add a ref `formScoresRef` that collects form quality data points. In `endWorkout`, calculate the average from real data.

**New code pattern:**
```javascript
const formScoresRef = useRef([]);
// In analyzeFrame, when data comes back:
formScoresRef.current.push(data.form_quality === 'good' ? 1 : 0);
// In endWorkout:
const goodRatio = formScoresRef.current.length > 0
  ? formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length
  : 0.5;
const score = Math.round(goodRatio * 100);
```

#### Step 8: Limit `getExerciseDistribution` date range
**File:** `frontend/src/db.js` lines 473-501
**Problem:** Fetches ALL sessions for the user with no date filter — costly for users with many workouts.
**Fix:** Add a 12-month date filter similar to `getHeatmapData` and `getWeeklyActivity`:

```javascript
const twelveMonthsAgo = new Date();
twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
const q = query(
  collection(db, "sessions"),
  where("userId", "==", userId),
  where("timestamp", ">=", twelveMonthsAgo),
  orderBy("timestamp", "asc")
);
```

---

### 🎨 Phase 3 — World-Class Modern UI

#### Step 9: Toast notification system
**New file:** `frontend/src/components/Toast.jsx`
**New file:** `frontend/src/ToastContext.jsx`

Create a centralized toast system:
- `ToastContext` with `addToast(message, type, duration)` 
- `ToastContainer` component rendering toasts in top-right corner
- Types: `success` (green), `error` (red), `info` (purple), `warning` (orange)
- Auto-dismiss after `duration` ms (default 3000ms)
- CSS animation: slide in from right, fade out
- Replace all `setMessage` patterns:
  - `Auth.jsx`: error handling (already uses inline, no change needed for errors, but add success toast on signup)
  - `Profile.jsx`: replace `setMessage` with `addToast` for save/upload messages
  - `Friends.jsx`: replace `setActionMessage` with `addToast`
  - `WorkoutAnalyzer.jsx`: replace `alert()` with toast for LLM key missing message

**ToastContext.jsx structure:**
```jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: 'fixed', top: 80, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
```

**CSS to add to `index.css`:**
```css
.toast {
  padding: 14px 22px;
  border-radius: 14px;
  font-weight: 600;
  font-size: 14px;
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  animation: toastIn 0.3s ease;
  max-width: 380px;
  line-height: 1.5;
}
.toast-success { background: rgba(0,184,148,0.92); color: white; border: 1px solid rgba(0,184,148,0.3); }
.toast-error   { background: rgba(255,107,107,0.92); color: white; border: 1px solid rgba(255,107,107,0.3); }
.toast-info    { background: rgba(108,92,231,0.92); color: white; border: 1px solid rgba(108,92,231,0.3); }
.toast-warning { background: rgba(253,203,110,0.92); color: #1A1A2E; border: 1px solid rgba(253,203,110,0.3); }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

**In `App.jsx`:** Wrap `<BrowserRouter>` with `<ToastProvider>`

#### Step 10: Page transition animations
**File:** `frontend/src/index.css` — add:
```css
@view-transition { navigation: auto; }

@keyframes view-enter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

::view-transition-new(root) {
  animation: view-enter 0.3s ease;
}
```

**Fallback approach (if view transitions API not supported):**
Each page component already has `animate-slide-down`/`animate-slide-up` classes. Add a wrapper in `App.jsx` that applies a keyed div to trigger re-animation on route change:

```jsx
// In App.jsx, wrap Route elements:
<div key={location.pathname} className="page-transition-wrapper">
  <Outlet />
</div>
```

#### Step 11: Animated stat counters
**New file:** `frontend/src/components/AnimatedCounter.jsx`

```jsx
import { useState, useEffect, useRef } from 'react';

export default function AnimatedCounter({ value, duration = 800, suffix = '', prefix = '' }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const startTime = performance.now();
    
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}
```

**Replace in `Dashboard.jsx`:** `<AnimatedCounter value={totalReps} />` instead of `{totalReps.toLocaleString()}`
**Replace in `Profile.jsx`:** Same for stat values

#### Step 12: Workout HUD redesign
**File:** `frontend/src/components/WorkoutAnalyzer.jsx`

Major overhaul of the camera overlay (lines 452-541):

**New HUD layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐                    ┌──────────┐ ┌──────────┐  │
│ │ REPS     │   ✓ GOOD FORM      │ TIME     │ │FORM COACH│  │
│ │ 42       │                    │ 5:23     │ │Great job!│  │
│ └──────────┘                    └──────────┘ └──────────┘  │
│                            ┌──────────────┐                │
│                            │⬇ DOWN        │                │
│                            └──────────────┘                │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ███████████████████████████████░░░░░░░░░░ 72% toward   ││
│ │ last session's reps (58)                                ││
│ └─────────────────────────────────────────────────────────┘│
│               [▶ Resume]    [■ End]                        │
└─────────────────────────────────────────────────────────────┘
```

**Key changes:**
- Add progress bar showing progress toward last session's reps
- Make rep counter bigger with colored glow based on form quality
- Keep timer in top right
- Keep form coach feedback top right
- Keep stage indicator bottom-left
- Add form quality gauge (small circle with percentage)
- Make all overlays more readable with better glass effect
- Smoother animations for state changes

**CSS additions for workout HUD:**
```css
.hud-reps {
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  padding: 12px 22px;
  border: 2px solid;
  transition: border-color 0.3s;
}
.hud-reps.good { border-color: #00B894; box-shadow: 0 0 20px rgba(0,184,148,0.3); }
.hud-reps.bad  { border-color: #FF6B6B; box-shadow: 0 0 20px rgba(255,107,107,0.3); }

.hud-progress {
  position: absolute;
  bottom: 70px;
  left: 14px;
  right: 14px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.15);
  overflow: hidden;
}
.hud-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
  background: linear-gradient(90deg, var(--primary), var(--accent-pink));
}
```

#### Step 13: Full responsive overhaul
**Files to modify:** All components

**Auth.jsx:**
- Add `auth-left` class to left panel
- Ensure the CSS media query actually hides it on < 900px
- On mobile, make form full-width with less padding

**Dashboard.jsx:**
- Grid `1.55fr 1fr` → `1fr` below 900px (already in CSS but ensure it works)
- Auto-fit stat cards with min-width 160px
- Quick actions: 3 cols → 2 cols → 1 col

**WorkoutAnalyzer.jsx:**
- Camera aspect ratio should adapt
- HUD elements should stack on small screens
- Voice coach pill should wrap

**Leaderboard.jsx:**
- Podium should stack vertically on mobile
- Rankings list should be full-width

**Friends.jsx:**
- Tabs should scroll horizontally on mobile
- Friend cards should be full-width

**Profile.jsx:**
- Grid 320px 1fr → 1fr below 800px (already handled)
- Stats 3-col → 2-col → 1-col

**CSS additions for responsive:**
```css
@media (max-width: 640px) {
  .main-content { padding: calc(var(--nav-height) + 16px) 12px 24px; }
  .hud-reps { padding: 8px 14px; }
  .hud-reps p:last-child { font-size: 36px !important; }
}
```

#### Step 14: Empty state SVG illustrations
**New file:** `frontend/src/components/EmptyState.jsx`

Create reusable SVG illustrations for empty states:

```jsx
export function EmptyWorkouts({ color = '#6C5CE7' }) { /* dumbbell SVG */ }
export function EmptyFriends({ color = '#FD79A8' }) { /* people SVG */ }
export function EmptyLeaderboard({ color = '#FDCB6E' }) { /* trophy SVG */ }
export function EmptySearch({ color = '#00CEC9' }) { /* search SVG */ }
```

Replace inline empty states in:
- `Dashboard.jsx` line 266-272: Replace `<Dumbbell size={36} ...>` with `<EmptyWorkouts />`
- `Profile.jsx` line 286-292: Same
- `Friends.jsx` line 344-346, 416-424, 492-507: Replace with `<EmptyFriends />` etc.
- `Leaderboard.jsx` line 62-68: Replace with `<EmptyLeaderboard />`

**SVG illustration style:** Modern minimalist line-art with rounded strokes, matching the purple/pink brand palette. Use the existing primary/accent colors.

#### Step 15: Micro-interactions + skeleton loaders

**Micro-interactions (add to `index.css`):**
```css
/* Button ripple effect */
.btn-skeu { position: relative; overflow: hidden; }
.btn-skeu::after {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.2) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.btn-skeu:active::after { opacity: 1; }
```

**Skeleton loaders (add to `index.css`):**
```css
.skeleton-page { padding: calc(var(--nav-height) + 32px) 24px 48px; max-width: 1200px; margin: 0 auto; }
.skeleton-header { height: 40px; width: 60%; margin-bottom: 24px; }
.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 28px; }
.skeleton-card { height: 100px; border-radius: var(--radius-md); }
```

**Create skeleton components for each page:**
- `DashboardSkeleton` — mimics dashboard layout with shimmering gray blocks
- `ProfileSkeleton` — mimics profile layout
- `LeaderboardSkeleton` — mimics leaderboard layout
- `FriendsSkeleton` — mimics friends layout
- `WorkoutSkeleton` — mimics workout page layout

Each replaces the current `<div className="loading-spinner" />` + text loading states.

#### Step 16: Form score trend chart
**File:** `frontend/src/components/Profile.jsx`

Add after the stats grid (before workout history):

```jsx
// Add import:
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';

// Add state:
const [formTrend, setFormTrend] = useState([]);

// In the useEffect, after sessions load:
const trendData = sessions
  .filter(s => s.formScore > 0)
  .slice(0, 20)
  .reverse()
  .map((s, i) => ({
    session: `#${i + 1}`,
    score: s.formScore,
    date: s.timestamp ? new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  }));
setFormTrend(trendData);

// Add UI section:
{formTrend.length > 1 && (
  <div className="glass-card animate-slide-up" style={{ padding: 24 }}>
    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Form Trend</h3>
    <div style={{ height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={formTrend} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12 }} />
          <Line type="monotone" dataKey="score" stroke="#6C5CE7" strokeWidth={3} dot={{ fill: '#6C5CE7', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}
```

---

### 🟢 Phase 4 — Cleanup

#### Step 17: Backend analysis safety
**File:** `backend/main.py`

**Add concurrency guard in `analyze_frame`:**
```python
import asyncio
analysis_locks = {}

# Near top, after analyzers dict:
analysis_locks = {}

# In analyze_frame, before processing:
lock_key = req.session_id
if lock_key not in analysis_locks:
    analysis_locks[lock_key] = asyncio.Lock()
async with analysis_locks[lock_key]:
    # existing analysis code
```

**Remove dead WebSocket code (lines 201-234):**
Delete the entire `@app.websocket("/session/stream")` endpoint and its handler.

#### Step 18: Remove unused deps and empty directories
- Remove `phototo/` directory: `Remove-Item -Recurse -Force phototo`
- Remove `date-fns` from `frontend/package.json` if it's confirmed unused
- Clean up `__pycache__` directories
- Clean up `frontend/dist` if not needed for dev

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `frontend/.env` | Full Firebase + Cloudinary + Gemini config |
| `backend/.env` | **NEW** — Cloudinary + CORS config |
| `backend/analyzer.py` | Remove pyrefly comment, fix Crunch stage init |
| `backend/main.py` | Add async lock, remove WebSocket dead code |
| `frontend/src/index.css` | Remove dup slideDown, add toast/HUD/skeleton/responsive CSS |
| `frontend/src/App.jsx` | Wrap with ToastProvider |
| `frontend/src/components/Auth.jsx` | Add auth-left class |
| `frontend/src/components/Dashboard.jsx` | Animated counters, empty state SVG, skeleton loader |
| `frontend/src/components/WorkoutAnalyzer.jsx` | Real form tracking, HUD redesign, progress bar |
| `frontend/src/components/Profile.jsx` | Form trend chart, toast, animated counters |
| `frontend/src/components/Friends.jsx` | Toast, empty state SVGs |
| `frontend/src/components/Leaderboard.jsx` | Skeleton loader, empty state SVG |
| `frontend/src/components/Navbar.jsx` | Minor responsive fixes |
| `frontend/src/ToastContext.jsx` | **NEW** — Toast system |
| `frontend/src/components/Toast.jsx` | **NEW** — Toast container |
| `frontend/src/components/AnimatedCounter.jsx` | **NEW** — Animated counter |
| `frontend/src/components/EmptyState.jsx` | **NEW** — SVG illustrations |
| `frontend/src/db.js` | Add date range to getExerciseDistribution |

## Verification Steps

After all changes, verify:
1. `cd frontend && npm run dev` — app starts without errors
2. Auth page loads — can sign up / sign in with Firebase
3. Dashboard shows real data after a workout
4. Workout analyzer camera starts, skeleton draws, rep counter works
5. Profile uploads photo to Cloudinary
6. Leaderboard shows rankings
7. Friends search/add/accept works
8. Toast notifications appear on successful actions
9. All pages are responsive on mobile viewport
10. Animations and transitions work smoothly
