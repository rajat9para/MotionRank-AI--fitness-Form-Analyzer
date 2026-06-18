================================================================================
  MOTIONRANK AI — MASTER IMPLEMENTATION PLAN & TODO LIST
  Generated: 2026-06-18
  Status: IN PROGRESS
================================================================================

This file contains EVERYTHING that needs to be done, step by step, with exact
file paths, line numbers, and what to change. Follow this top-to-bottom.

================================================================================
  PHASE 1: FIX CAMERA + PLANK TIMER (Critical UX — Do First)
================================================================================

1.1 FIX CAMERA NOT OPENING
---------------------------
Root cause: WorkoutAnalyzer.jsx conditionally renders <video> only when
cameraStarted=true. But startCamera() tries to assign stream to videoRef.current
BEFORE cameraStarted is set true. videoRef.current is null → stream attaches to
nothing → black screen.

FILE: frontend/src/components/WorkoutAnalyzer.jsx

FIX: Always render the <video> element (hidden when not in use) so videoRef is
always in the DOM.

  - Lines ~406-451: Change the ternary that conditionally renders <video>
    BEFORE (broken):
      {!cameraStarted ? (
        <div className="placeholder">...</div>
      ) : (
        <div className="camera-area">
          <video ref={videoRef} ... />
          <canvas ref={overlayRef} ... />
          ...
        </div>
      )}

    AFTER (fixed):
      <div className="camera-area" style={{ display: cameraStarted ? 'block' : 'none' }}>
        <video ref={videoRef} ... />
        <canvas ref={overlayRef} ... />
        ...HUD overlays...
      </div>
      {!cameraStarted && (
        <div className="placeholder">...Start button...</div>
      )}

  This ensures videoRef.current is ALWAYS available in the DOM.

1.2 FIX CAMERA PERMISSION ERROR VISIBILITY
--------------------------------------------
FILE: frontend/src/components/WorkoutAnalyzer.jsx

  - Add state: const [cameraError, setCameraError] = useState('');
  - In startCamera() catch block (line ~117-119):
    BEFORE: setFeedback('Camera access denied...');
    AFTER:  setCameraError('Camera access denied. Please allow camera permissions in your browser settings.');
  - In the placeholder area (when !cameraStarted), render cameraError:
    {cameraError && <p style={{color:'#FF6B6B', fontSize:13, marginTop:8}}>{cameraError}</p>}

1.3 FIX PLANK TIMER (10x too slow)
------------------------------------
Root cause: PlankAnalyzer increments hold_seconds every 25 frames. At 400ms
per frame, that's every 10 seconds.

FILE: backend/analyzer.py

  - In PlankAnalyzer.analyze() method (around line 425):
    BEFORE: if self._frame_count % 25 == 0:
    AFTER:  if self._frame_count % 3 == 0:  # ~1.2 seconds at 400ms/frame

    OR better — use actual time tracking instead of frame counting:
    - Add self._last_time = time.time() in __init__
    - In analyze(): elapsed = time.time() - self._last_time; if elapsed >= 1.0: self.hold_seconds += 1; self._last_time = time.time()

1.4 SHOW goodFormSeconds IN PLANK HUD
---------------------------------------
FILE: frontend/src/components/WorkoutAnalyzer.jsx

  - In the HUD rendering section (around line 468-475), when isPlank:
    Show both holdSeconds and goodFormSeconds:
      <div className="hud-timer">
        <span style={{fontSize:32, fontWeight:900}}>{holdSeconds}s</span>
        <span style={{fontSize:11, color:'var(--text-muted)'}}>Hold Time</span>
      </div>
      <div className="hud-timer">
        <span style={{fontSize:32, fontWeight:900, color:'#34D399'}}>{goodFormSeconds}s</span>
        <span style={{fontSize:11, color:'var(--text-muted)'}}>Good Form</span>
      </div>

1.5 FIX STALE CLOSURE BUGS IN analyzeFrame
---------------------------------------------
FILE: frontend/src/components/WorkoutAnalyzer.jsx

  - Add refs for comparison values:
    const lastRepsRef = useRef(0);
    const lastFeedbackRef = useRef('');

  - In analyzeFrame, use refs instead of state for comparisons:
    BEFORE: if (data.reps > reps) { voiceCoach.motivation(data.reps); }
    AFTER:  if (data.reps > lastRepsRef.current) { voiceCoach.motivation(data.reps); lastRepsRef.current = data.reps; }

    BEFORE: else if (data.form_quality !== 'good' && data.feedback !== feedback) {
    AFTER:  else if (data.form_quality !== 'good' && data.feedback !== lastFeedbackRef.current) {
      lastFeedbackRef.current = data.feedback;
      ...

  - Reset refs in startWorkout():
    lastRepsRef.current = 0;
    lastFeedbackRef.current = '';

1.6 FIX JPEG QUALITY
----------------------
FILE: frontend/src/components/WorkoutAnalyzer.jsx

  - In captureFrame() (line ~129):
    BEFORE: return c.toDataURL('image/jpeg', 0.5).split(',')[1];
    AFTER:  return c.toDataURL('image/jpeg', 0.75).split(',')[1];


================================================================================
  PHASE 2: THEME CONSISTENCY + VISUAL POLISH
================================================================================

2.1 ADD GRAIN OVERLAY TO ALL POST-LOGIN PAGES
----------------------------------------------
FILE: frontend/src/index.css

  Add to .page-wrapper:
    .page-wrapper::after {
      content: '';
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background-image: url("data:image/svg+xml,...");  /* same grain pattern as landing */
      opacity: 0.35;
      mix-blend-mode: overlay;
    }

  This adds the subtle film-grain texture from the landing page to ALL
  authenticated pages, creating visual continuity.

2.2 NORMALIZE EMPTY STATES
----------------------------
FILE: frontend/src/components/Community.jsx (line ~287)
  Replace inline <div className="glass-card-strong empty-state"> with
  <EmptyState icon={MessageSquare} title="No Posts Yet" subtitle="..." />

FILE: frontend/src/components/Friends.jsx (line ~474)
  Already uses EmptyState component in some places — verify consistency.

2.3 ADD SECOND BLOB TO COMMUNITY/ADMIN/BUGREPORT
--------------------------------------------------
FILE: frontend/src/components/Community.jsx
  Add second blob: <div className="bg-blob" style={{bottom:'10%',right:'10%',width:300,height:300,background:'#c6f135',opacity:0.04,animationDelay:'-6s'}} />

FILE: frontend/src/components/Admin.jsx
  Add second blob with volt color alongside the red one.

FILE: frontend/src/components/BugReport.jsx
  Add second blob with volt color.


================================================================================
  PHASE 3: MONGODB WIRING + SECURITY
================================================================================

3.1 ADD FIREBASE TOKEN VERIFICATION TO BACKEND
------------------------------------------------
FILE: backend/requirements.txt
  Add: firebase-admin

FILE: backend/firebase_admin_init.py (NEW)
  import firebase_admin
  from firebase_admin import credentials, auth
  import os

  cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
  if cred_path and not firebase_admin._apps:
      cred = credentials.Certificate(cred_path)
      firebase_admin.initialize_app(cred)

  def verify_firebase_token(token):
      try:
          return auth.verify_id_token(token)
      except Exception:
          return None

FILE: backend/.env
  Add: FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

  You need to:
  1. Go to Firebase Console → Project Settings → Service Accounts
  2. Click "Generate New Private Key"
  3. Save the JSON file to backend/ folder
  4. Set the path in .env

FILE: backend/main.py
  Add middleware or dependency:
    from firebase_admin_init import verify_firebase_token

    async def get_current_user(request: Request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing token")
        token = auth_header.split("Bearer ")[1]
        claims = verify_firebase_token(token)
        if not claims:
            raise HTTPException(status_code=401, detail="Invalid token")
        return claims

  Then add `user = Depends(get_current_user)` to protected endpoints.

3.2 ADD ADMIN ROLE CHECKING
------------------------------
FILE: backend/main.py

  ADMIN_EMAILS = ['rajat@example.com', 'admin@motionrank.com']

  async def require_admin(user = Depends(get_current_user)):
      if user.get('email') not in ADMIN_EMAILS:
          raise HTTPException(status_code=403, detail="Admin access required")
      return user

  Apply to admin-only endpoints (ban/unban, announcements, etc.)

3.3 ADD BANNED USER ENFORCEMENT
---------------------------------
FILE: frontend/src/components/WorkoutAnalyzer.jsx
  After auth.onAuthStateChanged, check if user is banned:
    const userProfile = await getUserProfile(u.uid);
    if (userProfile?.banned) {
      navigate('/');
      return;
    }

FILE: frontend/src/components/Community.jsx — same check
FILE: frontend/src/components/Dashboard.jsx — same check

3.4 ADD MONGODB INDEXES
--------------------------
FILE: backend/database.py or main.py lifespan

  async def create_indexes():
      db = await get_db()
      await db["sessions"].create_index([("userId", 1), ("timestamp", -1)])
      await db["sessions"].create_index([("userId", 1)])
      await db["users"].create_index([("totalReps", -1)])

  Call create_indexes() inside the lifespan startup block.


================================================================================
  PHASE 4: COMMUNITY + ADMIN COMPLETENESS
================================================================================

4.1 FIX CLOUDINARY CREDENTIALS FOR FRONTEND
---------------------------------------------
FILE: frontend/.env
  Add:
    VITE_CLOUDINARY_CLOUD_NAME=dmanesip5
    VITE_CLOUDINARY_UPLOAD_PRESET=motionrank_unsigned
    VITE_CLOUDINARY_FOLDER=community_posts

  You need to create an unsigned upload preset in Cloudinary:
  1. Go to Cloudinary Dashboard → Settings → Upload
  2. Scroll to "Upload presets" → Add new preset
  3. Preset name: motionrank_unsigned
  4. Signing mode: Unsigned
  5. Folder: community_posts
  6. Save

4.2 FIX addComment RACE CONDITION
-----------------------------------
FILE: frontend/src/communityDb.js

  BEFORE: await updateDoc(postRef, { commentsCount: (await getDoc(postRef)).data().commentsCount + 1 });
  AFTER:  import { increment } from 'firebase/firestore';
          await updateDoc(postRef, { commentsCount: increment(1) });

4.3 ADD INFINITE SCROLL TO COMMUNITY FEED
-------------------------------------------
FILE: frontend/src/communityDb.js
  Add getFeedPostsPaginated(lastTimestamp, pageSize=15) with startAfter cursor

FILE: frontend/src/components/Community.jsx
  - Add lastDoc state, hasMore state
  - Add loadMore function
  - Use IntersectionObserver on sentinel div at bottom of feed

4.4 WIRE ADMIN POST DELETION
------------------------------
FILE: frontend/src/components/Admin.jsx
  Import deletePost, add delete button on each post

4.5 ADD CHALLENGE MANAGEMENT TO ADMIN
---------------------------------------
FILE: frontend/src/components/Admin.jsx
  Add "Challenges" tab with create form + active challenges list

4.6 ADD DAU/WAU STATS TO ADMIN
---------------------------------
FILE: frontend/src/adminDb.js — add getDAU() function
FILE: frontend/src/components/Admin.jsx — add DAU stat card

4.7 ADD LEADERBOARD VIEW TO ADMIN
------------------------------------
FILE: frontend/src/components/Admin.jsx — add leaderboard section


================================================================================
  PHASE 5: CLEANUP + POLISH
================================================================================

5.1 REMOVE DEAD CODE
  - backend/models.py — use or delete
  - Empty phototo/ directory — delete

5.2 PIN VERSIONS IN requirements.txt

5.3 VERIFY .gitignore COVERS SECRETS
  - backend/.env
  - frontend/.env
  - *.json service account keys


================================================================================
  WHERE TO ADD KEYS & CREDENTIALS
================================================================================

FILE: backend/.env
  MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/motionrank?retryWrites=true&w=majority
  CLOUDINARY_CLOUD_NAME=dmanesip5
  CLOUDINARY_API_KEY=***
  CLOUDINARY_API_SECRET=***
  FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

FILE: frontend/.env
  VITE_API_URL=http://localhost:8000
  VITE_FIREBASE_API_KEY=***
  VITE_FIREBASE_AUTH_DOMAIN=ai-fitness-form-analyzer.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=ai-fitness-form-analyzer
  VITE_GEMINI_API_KEY=***
  VITE_CLOUDINARY_CLOUD_NAME=dmanesip5
  VITE_CLOUDINARY_UPLOAD_PRESET=motionrank_unsigned

FIREBASE SERVICE ACCOUNT:
  1. console.firebase.google.com → Project Settings → Service Accounts
  2. Generate New Private Key → save as backend/serviceAccountKey.json
  3. Add to .gitignore!

CLOUDINARY UPLOAD PRESET:
  1. cloudinary.com → Console → Settings → Upload
  2. Add upload preset: motionrank_unsigned (Unsigned, folder: community_posts)

MONGODB ATLAS:
  1. cloud.mongodb.com → Create M0 cluster
  2. Database Access → Add user
  3. Network Access → Add 0.0.0.0/0
  4. Connect → Copy connection string → Paste in .env


================================================================================
  EXECUTION ORDER
================================================================================

  [ ] Phase 1: Camera + Plank fixes (2-3 hours)
  [ ] Phase 2: Theme consistency (1 hour)
  [ ] Phase 3: Security + MongoDB (3-4 hours)
  [ ] Phase 4: Community + Admin (3-4 hours)
  [ ] Phase 5: Cleanup (30 min)

Total estimated: 10-12 hours of focused work.
================================================================================
