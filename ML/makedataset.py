"""
collect_data.py — Multi-Exercise Form Data Collector (MediaPipe 0.10.x+ Tasks API)
====================================================================================
Supports: Push-ups (1), Squats (2), Crunches (3)

NEW in this version:
  • HUD with live recording timer (MM:SS)
  • Progress meter — needle sweeps RED → YELLOW → GREEN as frames approach target
  • Updated controls legend showing P: Pause  R: Resume

On startup:
  • Asks which exercise (1/2/3)
  • Asks how many reps to collect (used as frame threshold for the meter)
  • Shows RELAX screen → 3-2-1-GO countdown → auto-starts recording

CONTROLS:
  G  → label = GOOD rep  (Target = 1)
  B  → label = BAD rep   (Target = 0)
  P  → Pause recording
  R  → Resume recording (instant, no countdown)
  Q  → Quit and save CSV
"""

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import time
import os
import sys
import math
import urllib.request

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
CAMERA_INDEX    = 0
FRAME_WIDTH     = 1280
FRAME_HEIGHT    = 720
MIN_VISIBILITY  = 0.5
LANDMARK_COUNT  = 33
# Frames-per-rep estimate used to convert "reps" → frame threshold for meter
FRAMES_PER_REP  = 30   # ~1 second @ 30fps per rep

MODEL_FILENAME = "pose_landmarker_full.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_full/float16/latest/"
    "pose_landmarker_full.task"
)

EXERCISE_MAP = {
    "1": ("pushups",  "pushups.csv"),
    "2": ("squats",   "squats.csv"),
    "3": ("crunches", "crunches.csv"),
}

# ─────────────────────────────────────────────────────────────
# MEDIAPIPE TASKS API
# ─────────────────────────────────────────────────────────────
BaseOptions           = mp.tasks.BaseOptions
PoseLandmarker        = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode     = mp.tasks.vision.RunningMode
PoseLandmark = mp.solutions.pose.PoseLandmark

_L_HIP   = int(PoseLandmark.LEFT_HIP)
_R_HIP   = int(PoseLandmark.RIGHT_HIP)
_L_KNEE  = int(PoseLandmark.LEFT_KNEE)
_R_KNEE  = int(PoseLandmark.RIGHT_KNEE)
_L_ANKLE = int(PoseLandmark.LEFT_ANKLE)
_R_ANKLE = int(PoseLandmark.RIGHT_ANKLE)

# ─────────────────────────────────────────────────────────────
# SKELETON CONNECTIONS
# ─────────────────────────────────────────────────────────────
POSE_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,7),
    (0,4),(4,5),(5,6),(6,8),
    (9,10),
    (11,12),(11,13),(13,15),(15,17),(15,19),(15,21),(17,19),
    (12,14),(14,16),(16,18),(16,20),(16,22),(18,20),
    (11,23),(12,24),(23,24),
    (23,25),(25,27),(27,29),(27,31),(29,31),
    (24,26),(26,28),(28,30),(28,32),(30,32),
]

# ─────────────────────────────────────────────────────────────
# MODEL DOWNLOAD
# ─────────────────────────────────────────────────────────────
def ensure_model(path: str):
    if os.path.exists(path):
        print(f"[MODEL] Found: {path}")
        return
    print(f"[MODEL] Downloading pose model (~6 MB) …")
    try:
        def _progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            pct = min(100, int(downloaded * 100 / total_size)) if total_size > 0 else 0
            bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
            print(f"\r        [{bar}] {pct}%", end="", flush=True)
        urllib.request.urlretrieve(MODEL_URL, path, reporthook=_progress)
        print(f"\n[MODEL] Saved → {path}")
    except Exception as e:
        sys.exit(
            f"\n[ERROR] Model download failed: {e}\n"
            f"  Download manually from:\n  {MODEL_URL}\n"
            f"  and place it as '{MODEL_FILENAME}'"
        )

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def check_visibility(landmarks) -> bool:
    key_ids = [_L_HIP, _R_HIP, _L_KNEE, _R_KNEE, _L_ANKLE, _R_ANKLE]
    return all(landmarks[i].visibility >= MIN_VISIBILITY for i in key_ids)


def landmarks_to_row(landmarks, target: int, stage: int) -> list:
    row = []
    for lm in landmarks:
        row.extend([lm.x, lm.y, lm.z, lm.visibility])
    row.append(target)
    row.append(stage)
    return row


def build_column_names() -> list:
    cols = []
    for i in range(1, LANDMARK_COUNT + 1):
        cols += [f"x{i}", f"y{i}", f"z{i}", f"v{i}"]
    cols += ["Target", "Stage"]
    return cols


# ─────────────────────────────────────────────────────────────
# CLEAN GREEN SKELETON
# ─────────────────────────────────────────────────────────────
def draw_skeleton(frame, landmarks):
    h, w = frame.shape[:2]
    pts = []
    for lm in landmarks:
        pts.append((int(lm.x * w), int(lm.y * h), lm.visibility))

    for (a, b) in POSE_CONNECTIONS:
        if a < len(pts) and b < len(pts):
            if pts[a][2] >= MIN_VISIBILITY and pts[b][2] >= MIN_VISIBILITY:
                cv2.line(frame,
                         (pts[a][0], pts[a][1]),
                         (pts[b][0], pts[b][1]),
                         (0, 255, 80), 2, cv2.LINE_AA)

    for (px, py, vis) in pts:
        if vis >= MIN_VISIBILITY:
            cv2.circle(frame, (px, py), 5, (0, 255, 80), -1, cv2.LINE_AA)
            cv2.circle(frame, (px, py), 5, (255, 255, 255), 1, cv2.LINE_AA)


# ─────────────────────────────────────────────────────────────
# PROGRESS METER  (semicircle gauge, needle red→green)
# ─────────────────────────────────────────────────────────────
def draw_meter(frame, frame_count: int, frame_threshold: int):
    """
    Draw a semicircle gauge in the bottom-right corner.
    Needle sweeps from left (red, 0%) to right (green, 100%).
    Arc itself is colour-graded red → yellow → green.
    """
    h, w = frame.shape[:2]

    cx     = w - 110    # centre X
    cy     = h - 40     # centre Y (below arc)
    radius = 80
    thick  = 14

    pct = min(1.0, frame_count / max(frame_threshold, 1))

    # ── Draw arc segments (colour gradient) ──
    # Semicircle: 180° (left=180°) → 0° (right=0°) in OpenCV angles
    total_steps = 60
    for i in range(total_steps):
        t0 = i / total_steps
        t1 = (i + 1) / total_steps
        # angle: 180 → 0  (left to right)
        ang0 = int(180 - t0 * 180)
        ang1 = int(180 - t1 * 180)
        # colour: red(0,0,255) → yellow(0,255,255) → green(0,255,0)
        if t0 < 0.5:
            r, g, b = 0, int(255 * t0 * 2), 255
        else:
            r, g, b = 0, 255, int(255 * (1 - (t0 - 0.5) * 2))
        # dim if not yet reached
        if t0 > pct:
            r = r // 4; g = g // 4; b = b // 4
        cv2.ellipse(frame, (cx, cy), (radius, radius),
                    0, -ang1, -ang0, (b, g, r), thick)

    # ── Needle ──
    needle_angle_deg = 180 - pct * 180          # 180° (left) → 0° (right)
    needle_rad       = math.radians(needle_angle_deg)
    nx = int(cx + (radius - 4) * math.cos(needle_rad))
    ny = int(cy - (radius - 4) * math.sin(needle_rad))
    cv2.line(frame, (cx, cy), (nx, ny), (255, 255, 255), 3, cv2.LINE_AA)
    cv2.circle(frame, (cx, cy), 7, (255, 255, 255), -1, cv2.LINE_AA)

    # ── Labels ──
    pct_int = int(pct * 100)
    cv2.putText(frame, f"{pct_int}%",
                (cx - 18, cy - radius - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (220, 220, 220), 2)
    cv2.putText(frame, "0",
                (cx - radius - 12, cy + 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (120, 120, 120), 1)
    cv2.putText(frame, "MAX",
                (cx + radius - 10, cy + 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (120, 120, 120), 1)
    cv2.putText(frame, "PROGRESS",
                (cx - 42, cy + 34),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (160, 160, 160), 1)

    # Flash green border when complete
    if pct >= 1.0:
        cv2.ellipse(frame, (cx, cy), (radius + 6, radius + 6),
                    0, 180, 360, (0, 255, 80), 3)
        cv2.putText(frame, "DONE!", (cx - 30, cy - radius // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 80), 2)


# ─────────────────────────────────────────────────────────────
# HUD OVERLAY
# ─────────────────────────────────────────────────────────────
def draw_overlay(frame, state: dict, exercise_name: str, frame_threshold: int):
    h, w = frame.shape[:2]

    # Top banner
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 100), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

    # ── REC dot + status ──
    if state["recording"]:
        cv2.circle(frame, (30, 33), 12, (0, 0, 220), -1)
        cv2.putText(frame, "REC", (50, 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (60, 60, 255), 2)
    else:
        cv2.putText(frame, "PAUSED", (18, 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (130, 130, 130), 2)

    # ── Exercise name (centre top) ──
    cv2.putText(frame, exercise_name.upper(),
                (w // 2 - 110, 42),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 200, 255), 3)

    # ── Live timer (top-right) ──
    elapsed = state.get("elapsed_sec", 0.0)
    mins    = int(elapsed) // 60
    secs    = int(elapsed) % 60
    timer_str = f"{mins:02d}:{secs:02d}"
    cv2.putText(frame, timer_str,
                (w - 120, 42),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 220, 60), 2)
    cv2.putText(frame, "TIME",
                (w - 100, 65),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 160, 160), 1)

    # ── Good / Bad label (left, row 2) ──
    label_text  = "● GOOD REP" if state["target"] == 1 else "● BAD REP"
    label_color = (0, 220, 80)  if state["target"] == 1 else (60, 60, 230)
    cv2.putText(frame, label_text, (18, 82),
                cv2.FONT_HERSHEY_SIMPLEX, 0.85, label_color, 2)

    # ── Frame count + Good/Bad counts (centre, row 2) ──
    info = f"Frames: {state['frame_count']}   G:{state['good_count']}  B:{state['bad_count']}"
    cv2.putText(frame, info, (w // 2 - 160, 82),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (200, 200, 200), 1)

    # ── Controls legend (bottom-right, above meter) ──
    controls = [
        "G: Good rep    B: Bad rep",
        "P: Pause    R: Resume    Q: Quit & Save",
    ]
    for i, line in enumerate(reversed(controls)):
        cv2.putText(frame, line,
                    (w - 360, h - 145 - i * 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (160, 160, 160), 1)

    # ── Visibility warning ──
    if not state["visible"]:
        cv2.putText(frame, "! Body not fully visible - move back!",
                    (20, h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 100, 255), 2)

    # ── Progress meter (bottom-right) ──
    draw_meter(frame, state["frame_count"], frame_threshold)


# ─────────────────────────────────────────────────────────────
# RELAX SCREEN
# ─────────────────────────────────────────────────────────────
def show_relax_screen(cap, exercise_name: str, duration: int = 3):
    start = time.time()
    while time.time() - start < duration:
        ret, frame = cap.read()
        if not ret:
            continue
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), (20, 20, 20), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        cv2.putText(frame, "RELAX",
                    (w // 2 - 160, h // 2 - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 4.0, (0, 255, 180), 8, cv2.LINE_AA)
        cv2.putText(frame, exercise_name.upper(),
                    (w // 2 - 180, h // 2 + 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 200, 50), 3, cv2.LINE_AA)
        cv2.putText(frame, "Get into starting position...",
                    (w // 2 - 220, h // 2 + 110),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (200, 200, 200), 2)
        cv2.imshow("Exercise Data Collector", frame)
        if cv2.waitKey(30) & 0xFF == ord('q'):
            return False
    return True


# ─────────────────────────────────────────────────────────────
# COUNTDOWN  3-2-1-GO
# ─────────────────────────────────────────────────────────────
def show_countdown(cap) -> bool:
    for count in [3, 2, 1, "GO!"]:
        start = time.time()
        while time.time() - start < 1.0:
            ret, frame = cap.read()
            if not ret:
                continue
            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (w, h), (15, 15, 15), -1)
            cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
            color  = (0, 255, 80)   if count == "GO!" else (0, 200, 255)
            text_x = w // 2 - 120  if count == "GO!" else w // 2 - 80
            cv2.putText(frame, str(count),
                        (text_x, h // 2 + 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 5.0, color, 10, cv2.LINE_AA)
            cv2.putText(frame, "Get ready!",
                        (w // 2 - 110, h // 2 + 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (200, 200, 200), 2)
            cv2.imshow("Exercise Data Collector", frame)
            if cv2.waitKey(30) & 0xFF == ord('q'):
                return False
    return True


# ─────────────────────────────────────────────────────────────
# SAVE CSV
# ─────────────────────────────────────────────────────────────
def save_csv(rows: list, path: str, exercise_name: str):
    cols = build_column_names()
    df   = pd.DataFrame(rows, columns=cols)
    df.to_csv(path, index=False)
    good = int((df["Target"] == 1).sum())
    bad  = int((df["Target"] == 0).sum())
    print(f"\n[SAVED] {path}")
    print(f"  Exercise   : {exercise_name}")
    print(f"  Total rows : {len(df)}")
    print(f"  Good (1)   : {good}")
    print(f"  Bad  (0)   : {bad}")


# ─────────────────────────────────────────────────────────────
# CONSOLE MENU
# ─────────────────────────────────────────────────────────────
def select_exercise() -> tuple:
    print("\n" + "=" * 50)
    print("  EXERCISE FORM DATA COLLECTOR")
    print("=" * 50)
    print("\n  Select exercise:")
    print("    1 → Push-ups")
    print("    2 → Squats")
    print("    3 → Crunches")
    while True:
        choice = input("\n  Enter 1, 2 or 3: ").strip()
        if choice in EXERCISE_MAP:
            name, csv_file = EXERCISE_MAP[choice]
            break
        print("  ❌  Please enter 1, 2, or 3.")
    while True:
        reps_str = input(f"  How many reps to collect for {name}? ").strip()
        if reps_str.isdigit() and int(reps_str) > 0:
            reps = int(reps_str)
            break
        print("  ❌  Please enter a positive number.")
    return name, csv_file, reps


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
def main():
    exercise_name, csv_path, target_reps = select_exercise()

    # Frame threshold for meter: reps × ~30 frames each
    frame_threshold = target_reps * FRAMES_PER_REP

    # Delete old CSV → fresh start
    if os.path.exists(csv_path):
        os.remove(csv_path)
        print(f"\n[INFO] Deleted old {csv_path} — starting fresh.")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, MODEL_FILENAME)
    ensure_model(model_path)

    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        sys.exit(f"[ERROR] Cannot open camera {CAMERA_INDEX}.")
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    cap.set(cv2.CAP_PROP_FPS, 30)

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[INFO] Camera: {actual_w}×{actual_h}")
    print(f"[INFO] Frame threshold for meter: {frame_threshold} frames ({target_reps} reps × {FRAMES_PER_REP})")

    cv2.namedWindow("Exercise Data Collector", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Exercise Data Collector",
                     min(actual_w, 1280), min(actual_h, 720))

    if not show_relax_screen(cap, exercise_name, duration=3):
        cap.release(); cv2.destroyAllWindows(); return

    if not show_countdown(cap):
        cap.release(); cv2.destroyAllWindows(); return

    print(f"\n[READY] Recording {exercise_name}.")
    print(f"        G=Good  B=Bad  P=Pause  R=Resume  Q=Quit\n")

    all_rows = []

    state = {
        "recording"   : True,
        "target"      : 1,
        "stage"       : 0,
        "frame_count" : 0,
        "visible"     : True,
        "good_count"  : 0,
        "bad_count"   : 0,
        "elapsed_sec" : 0.0,
    }

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.7,
        min_pose_presence_confidence=0.7,
        min_tracking_confidence=0.7,
    )

    with PoseLandmarker.create_from_options(options) as landmarker:
        frame_idx   = 0
        rec_start   = time.time()   # when current recording segment started
        total_rec   = 0.0           # accumulated recorded seconds across pauses

        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            frame = cv2.flip(frame, 1)

            timestamp_ms = int(frame_idx * 1000 / 30)
            frame_idx   += 1

            # ── Update elapsed recording time ──
            if state["recording"]:
                state["elapsed_sec"] = total_rec + (time.time() - rec_start)

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image  = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            result    = landmarker.detect_for_video(mp_image, timestamp_ms)

            pose_detected = (
                result.pose_landmarks is not None and
                len(result.pose_landmarks) > 0
            )

            if pose_detected:
                landmarks       = result.pose_landmarks[0]
                state["visible"] = check_visibility(landmarks)

                draw_skeleton(frame, landmarks)

                if state["recording"]:
                    row = landmarks_to_row(landmarks, state["target"], state["stage"])
                    all_rows.append(row)
                    state["frame_count"] += 1
                    if state["target"] == 1:
                        state["good_count"] += 1
                    else:
                        state["bad_count"]  += 1

                    if state["frame_count"] % 500 == 0:
                        save_csv(all_rows, csv_path, exercise_name)
                        print(f"[AUTO-SAVE] {state['frame_count']} frames.")
            else:
                state["visible"] = False

            draw_overlay(frame, state, exercise_name, frame_threshold)
            cv2.imshow("Exercise Data Collector", frame)

            key = cv2.waitKey(1) & 0xFF

            if key == ord('q'):
                print("\n[QUIT] Saving and exiting...")
                break

            elif key == ord('g'):
                state["target"] = 1
                print("[LABEL] → GOOD rep (Target=1)")

            elif key == ord('b'):
                state["target"] = 0
                print("[LABEL] → BAD rep  (Target=0)")

            elif key == ord('p'):
                if state["recording"]:
                    total_rec         += time.time() - rec_start
                    state["recording"] = False
                    print(f"[PAUSE] {state['frame_count']} frames | {total_rec:.1f}s recorded.")

            elif key == ord('r'):
                if not state["recording"]:
                    rec_start          = time.time()   # reset segment start
                    state["recording"] = True
                    label = "GOOD" if state["target"] == 1 else "BAD"
                    print(f"[RESUME] Recording {label} reps.")

    cap.release()
    cv2.destroyAllWindows()

    if all_rows:
        save_csv(all_rows, csv_path, exercise_name)
    else:
        print("[WARN] No data collected.")


if __name__ == "__main__":
    main()