import math
import numpy as np
# pyrefly: ignore [missing-import]
import mediapipe as mp

mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    """
    Calculate angle between three points (a, b, c) where b is the vertex.
    Each point is a mediapipe landmark with x, y coordinates.
    """
    a = np.array([a.x, a.y])
    b = np.array([b.x, b.y])
    c = np.array([c.x, c.y])

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180.0:
        angle = 360 - angle

    return angle


def extract_key_landmarks(landmarks, indices):
    """
    Extract landmark coordinates as a list of {x, y, visibility} dicts
    for the frontend to draw skeleton overlays.
    """
    result = []
    for idx in indices:
        lm = landmarks[idx]
        result.append({
            "x": round(lm.x, 4),
            "y": round(lm.y, 4),
            "visibility": round(lm.visibility, 2)
        })
    return result


# Landmark indices used for skeleton connections by exercise
PUSHUP_LANDMARKS = [
    mp_pose.PoseLandmark.LEFT_SHOULDER.value,
    mp_pose.PoseLandmark.LEFT_ELBOW.value,
    mp_pose.PoseLandmark.LEFT_WRIST.value,
    mp_pose.PoseLandmark.LEFT_HIP.value,
    mp_pose.PoseLandmark.LEFT_KNEE.value,
    mp_pose.PoseLandmark.LEFT_ANKLE.value,
    mp_pose.PoseLandmark.RIGHT_SHOULDER.value,
    mp_pose.PoseLandmark.RIGHT_ELBOW.value,
    mp_pose.PoseLandmark.RIGHT_WRIST.value,
    mp_pose.PoseLandmark.RIGHT_HIP.value,
    mp_pose.PoseLandmark.RIGHT_KNEE.value,
    mp_pose.PoseLandmark.RIGHT_ANKLE.value,
]

SQUAT_LANDMARKS = [
    mp_pose.PoseLandmark.LEFT_SHOULDER.value,
    mp_pose.PoseLandmark.LEFT_HIP.value,
    mp_pose.PoseLandmark.LEFT_KNEE.value,
    mp_pose.PoseLandmark.LEFT_ANKLE.value,
    mp_pose.PoseLandmark.RIGHT_SHOULDER.value,
    mp_pose.PoseLandmark.RIGHT_HIP.value,
    mp_pose.PoseLandmark.RIGHT_KNEE.value,
    mp_pose.PoseLandmark.RIGHT_ANKLE.value,
]

CRUNCH_LANDMARKS = [
    mp_pose.PoseLandmark.LEFT_SHOULDER.value,
    mp_pose.PoseLandmark.LEFT_HIP.value,
    mp_pose.PoseLandmark.LEFT_KNEE.value,
    mp_pose.PoseLandmark.RIGHT_SHOULDER.value,
    mp_pose.PoseLandmark.RIGHT_HIP.value,
    mp_pose.PoseLandmark.RIGHT_KNEE.value,
]

# Skeleton connections for drawing — pairs of landmark indices
PUSHUP_CONNECTIONS = [
    # Left arm
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_ELBOW.value),
    (mp_pose.PoseLandmark.LEFT_ELBOW.value, mp_pose.PoseLandmark.LEFT_WRIST.value),
    # Left body
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_HIP.value),
    (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.LEFT_KNEE.value),
    (mp_pose.PoseLandmark.LEFT_KNEE.value, mp_pose.PoseLandmark.LEFT_ANKLE.value),
    # Right arm
    (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_ELBOW.value),
    (mp_pose.PoseLandmark.RIGHT_ELBOW.value, mp_pose.PoseLandmark.RIGHT_WRIST.value),
    # Right body
    (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
    (mp_pose.PoseLandmark.RIGHT_HIP.value, mp_pose.PoseLandmark.RIGHT_KNEE.value),
    (mp_pose.PoseLandmark.RIGHT_KNEE.value, mp_pose.PoseLandmark.RIGHT_ANKLE.value),
    # Shoulders
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_SHOULDER.value),
    # Hips
    (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
]

SQUAT_CONNECTIONS = [
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_HIP.value),
    (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.LEFT_KNEE.value),
    (mp_pose.PoseLandmark.LEFT_KNEE.value, mp_pose.PoseLandmark.LEFT_ANKLE.value),
    (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
    (mp_pose.PoseLandmark.RIGHT_HIP.value, mp_pose.PoseLandmark.RIGHT_KNEE.value),
    (mp_pose.PoseLandmark.RIGHT_KNEE.value, mp_pose.PoseLandmark.RIGHT_ANKLE.value),
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_SHOULDER.value),
    (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
]

CRUNCH_CONNECTIONS = [
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_HIP.value),
    (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.LEFT_KNEE.value),
    (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
    (mp_pose.PoseLandmark.RIGHT_HIP.value, mp_pose.PoseLandmark.RIGHT_KNEE.value),
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_SHOULDER.value),
    (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
]


class PushUpAnalyzer:
    def __init__(self):
        self.stage = "up"
        self.counter = 0
        self.feedback = "Ready"
        self.form_quality = "good"

    def analyze(self, landmarks):
        try:
            # Get coordinates — use both sides and pick the more visible one
            l_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            l_elbow = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value]
            l_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
            l_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            l_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
            l_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]

            r_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            r_elbow = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
            r_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
            r_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            r_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
            r_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

            # Use the more visible side
            if l_shoulder.visibility > r_shoulder.visibility:
                shoulder, elbow, wrist = l_shoulder, l_elbow, l_wrist
                hip, knee, ankle = l_hip, l_knee, l_ankle
            else:
                shoulder, elbow, wrist = r_shoulder, r_elbow, r_wrist
                hip, knee, ankle = r_hip, r_knee, r_ankle

            # Check if essential body parts are visible
            min_vis = min(shoulder.visibility, elbow.visibility, wrist.visibility, hip.visibility, ankle.visibility)
            if min_vis < 0.4:
                self.feedback = "Please step fully into the frame"
                self.form_quality = "bad"
                return self.counter, self.feedback, self.stage, self.form_quality, []

            # Primary angle: elbow (arm bend)
            elbow_angle = calculate_angle(shoulder, elbow, wrist)

            # Body alignment: shoulder-hip-ankle (should be ~170-180 for good form)
            body_angle = calculate_angle(shoulder, hip, ankle)

            # Form quality check
            form_issues = []
            if body_angle < 155:
                form_issues.append("Keep your body straight — hips are sagging")
                self.form_quality = "bad"
            elif body_angle < 165:
                form_issues.append("Straighten your body a bit more")
                self.form_quality = "bad"
            else:
                self.form_quality = "good"

            # Rep counting logic
            if elbow_angle > 160:
                if self.stage == "down":
                    self.counter += 1
                    if self.form_quality == "good":
                        self.feedback = "Perfect rep! Great form! 💪"
                    else:
                        self.feedback = "Rep counted, but fix your form"
                self.stage = "up"
            if elbow_angle < 90:
                self.stage = "down"
                if self.form_quality == "good":
                    self.feedback = "Good depth! Push up!"
                else:
                    self.feedback = " | ".join(form_issues) if form_issues else "Push up!"

            if self.stage == "up" and elbow_angle <= 160 and elbow_angle >= 90:
                if self.form_quality == "good":
                    self.feedback = "Go lower for a full rep"
                else:
                    self.feedback = " | ".join(form_issues) if form_issues else "Go lower"

            # Extract landmarks for frontend skeleton drawing
            all_landmarks = {}
            for idx in PUSHUP_LANDMARKS:
                lm = landmarks[idx]
                all_landmarks[idx] = {"x": round(lm.x, 4), "y": round(lm.y, 4)}

            connections = []
            for (a_idx, b_idx) in PUSHUP_CONNECTIONS:
                connections.append({
                    "start": all_landmarks.get(a_idx, {"x": 0, "y": 0}),
                    "end": all_landmarks.get(b_idx, {"x": 0, "y": 0})
                })

        except Exception as e:
            self.feedback = "Position your side to the camera"
            self.form_quality = "bad"
            connections = []

        return self.counter, self.feedback, self.stage, self.form_quality, connections


class SquatAnalyzer:
    def __init__(self):
        self.stage = "up"
        self.counter = 0
        self.feedback = "Ready"
        self.form_quality = "good"

    def analyze(self, landmarks):
        try:
            l_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            l_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            l_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
            l_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]

            r_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            r_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            r_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
            r_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

            # Use more visible side
            if l_hip.visibility > r_hip.visibility:
                shoulder, hip, knee, ankle = l_shoulder, l_hip, l_knee, l_ankle
            else:
                shoulder, hip, knee, ankle = r_shoulder, r_hip, r_knee, r_ankle

            # Check if essential body parts are visible
            min_vis = min(shoulder.visibility, hip.visibility, knee.visibility, ankle.visibility)
            if min_vis < 0.4:
                self.feedback = "Please step fully into the frame"
                self.form_quality = "bad"
                return self.counter, self.feedback, self.stage, self.form_quality, []

            # Primary angle: knee bend
            knee_angle = calculate_angle(hip, knee, ankle)

            # Back straightness: shoulder-hip vertical alignment
            back_angle = calculate_angle(shoulder, hip, knee)

            # Form checks
            form_issues = []
            if back_angle < 60:
                form_issues.append("Don't lean forward too much — keep chest up")
                self.form_quality = "bad"
            else:
                self.form_quality = "good"

            # Check knee over toe
            if knee.x > ankle.x + 0.05:
                form_issues.append("Knees going too far forward")
                self.form_quality = "bad"

            # Rep counting
            if knee_angle > 160:
                if self.stage == "down":
                    self.counter += 1
                    if self.form_quality == "good":
                        self.feedback = "Perfect squat! 🔥"
                    else:
                        self.feedback = "Rep counted — work on form"
                self.stage = "up"
            if knee_angle < 100:
                self.stage = "down"
                if self.form_quality == "good":
                    self.feedback = "Great depth! Stand up!"
                else:
                    self.feedback = " | ".join(form_issues) if form_issues else "Stand up!"

            if self.stage == "up" and knee_angle <= 160 and knee_angle >= 100:
                self.feedback = "Go deeper into the squat"

            # Extract landmarks
            all_landmarks = {}
            for idx in SQUAT_LANDMARKS:
                lm = landmarks[idx]
                all_landmarks[idx] = {"x": round(lm.x, 4), "y": round(lm.y, 4)}

            connections = []
            for (a_idx, b_idx) in SQUAT_CONNECTIONS:
                connections.append({
                    "start": all_landmarks.get(a_idx, {"x": 0, "y": 0}),
                    "end": all_landmarks.get(b_idx, {"x": 0, "y": 0})
                })

        except Exception as e:
            self.feedback = "Position yourself facing the camera"
            self.form_quality = "bad"
            connections = []

        return self.counter, self.feedback, self.stage, self.form_quality, connections


class CrunchAnalyzer:
    def __init__(self):
        self.stage = "down"  # Start lying down
        self.counter = 0
        self.feedback = "Ready — lie on your back"
        self.form_quality = "good"

    def analyze(self, landmarks):
        try:
            l_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            l_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            l_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]

            r_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            r_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            r_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]

            # Use more visible side
            if l_hip.visibility > r_hip.visibility:
                shoulder, hip, knee = l_shoulder, l_hip, l_knee
            else:
                shoulder, hip, knee = r_shoulder, r_hip, r_knee

            # Check if essential body parts are visible
            min_vis = min(shoulder.visibility, hip.visibility, knee.visibility)
            if min_vis < 0.4:
                self.feedback = "Please step fully into the frame"
                self.form_quality = "bad"
                return self.counter, self.feedback, self.stage, self.form_quality, []

            # Primary angle: shoulder-hip-knee (torso curl)
            torso_angle = calculate_angle(shoulder, hip, knee)

            # Form check: make sure knees are bent (not doing a sit-up)
            # Good crunch = partial curl, not full sit-up
            self.form_quality = "good"
            form_issues = []

            if torso_angle < 40:
                form_issues.append("Don't come up too far — keep it a crunch, not a sit-up")
                self.form_quality = "bad"

            # Rep counting — crunch is when torso curls up (angle decreases)
            if torso_angle > 140:
                # Lying flat
                if self.stage == "up":
                    self.counter += 1
                    if self.form_quality == "good":
                        self.feedback = "Great crunch! 🔥"
                    else:
                        self.feedback = "Rep counted — control the movement"
                self.stage = "down"
                self.feedback = self.feedback if self.counter > 0 else "Curl up slowly"
            if torso_angle < 90:
                # Crunched up
                self.stage = "up"
                if self.form_quality == "good":
                    self.feedback = "Hold and squeeze! Now lower slowly"
                else:
                    self.feedback = " | ".join(form_issues) if form_issues else "Lower slowly"

            if self.stage == "down" and torso_angle <= 140 and torso_angle >= 90:
                self.feedback = "Curl up more — engage your core"

            # Extract landmarks
            all_landmarks = {}
            for idx in CRUNCH_LANDMARKS:
                lm = landmarks[idx]
                all_landmarks[idx] = {"x": round(lm.x, 4), "y": round(lm.y, 4)}

            connections = []
            for (a_idx, b_idx) in CRUNCH_CONNECTIONS:
                connections.append({
                    "start": all_landmarks.get(a_idx, {"x": 0, "y": 0}),
                    "end": all_landmarks.get(b_idx, {"x": 0, "y": 0})
                })

        except Exception as e:
            self.feedback = "Position your side to the camera"
            self.form_quality = "bad"
            connections = []

        return self.counter, self.feedback, self.stage, self.form_quality, connections
