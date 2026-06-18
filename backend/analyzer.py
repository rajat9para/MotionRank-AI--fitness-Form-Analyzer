import math
import numpy as np
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

PLANK_LANDMARKS = [
    mp_pose.PoseLandmark.LEFT_SHOULDER.value,
    mp_pose.PoseLandmark.LEFT_HIP.value,
    mp_pose.PoseLandmark.LEFT_KNEE.value,
    mp_pose.PoseLandmark.LEFT_ANKLE.value,
    mp_pose.PoseLandmark.RIGHT_SHOULDER.value,
    mp_pose.PoseLandmark.RIGHT_HIP.value,
    mp_pose.PoseLandmark.RIGHT_KNEE.value,
    mp_pose.PoseLandmark.RIGHT_ANKLE.value,
]

# Skeleton connections for drawing — pairs of landmark indices
PUSHUP_CONNECTIONS = [
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_ELBOW.value),
    (mp_pose.PoseLandmark.LEFT_ELBOW.value, mp_pose.PoseLandmark.LEFT_WRIST.value),
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_HIP.value),
    (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.LEFT_KNEE.value),
    (mp_pose.PoseLandmark.LEFT_KNEE.value, mp_pose.PoseLandmark.LEFT_ANKLE.value),
    (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_ELBOW.value),
    (mp_pose.PoseLandmark.RIGHT_ELBOW.value, mp_pose.PoseLandmark.RIGHT_WRIST.value),
    (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
    (mp_pose.PoseLandmark.RIGHT_HIP.value, mp_pose.PoseLandmark.RIGHT_KNEE.value),
    (mp_pose.PoseLandmark.RIGHT_KNEE.value, mp_pose.PoseLandmark.RIGHT_ANKLE.value),
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_SHOULDER.value),
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

PLANK_CONNECTIONS = [
    (mp_pose.PoseLandmark.LEFT_SHOULDER.value, mp_pose.PoseLandmark.LEFT_HIP.value),
    (mp_pose.PoseLandmark.LEFT_HIP.value, mp_pose.PoseLandmark.LEFT_KNEE.value),
    (mp_pose.PoseLandmark.LEFT_KNEE.value, mp_pose.PoseLandmark.LEFT_ANKLE.value),
    (mp_pose.PoseLandmark.RIGHT_SHOULDER.value, mp_pose.PoseLandmark.RIGHT_HIP.value),
    (mp_pose.PoseLandmark.RIGHT_HIP.value, mp_pose.PoseLandmark.RIGHT_KNEE.value),
    (mp_pose.PoseLandmark.RIGHT_KNEE.value, mp_pose.PoseLandmark.RIGHT_ANKLE.value),
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

            if l_shoulder.visibility > r_shoulder.visibility:
                shoulder, elbow, wrist = l_shoulder, l_elbow, l_wrist
                hip, knee, ankle = l_hip, l_knee, l_ankle
            else:
                shoulder, elbow, wrist = r_shoulder, r_elbow, r_wrist
                hip, knee, ankle = r_hip, r_knee, r_ankle

            min_vis = min(shoulder.visibility, elbow.visibility, wrist.visibility, hip.visibility, ankle.visibility)
            if min_vis < 0.4:
                self.feedback = "Please step fully into the frame"
                self.form_quality = "bad"
                return self.counter, self.feedback, self.stage, self.form_quality, []

            elbow_angle = calculate_angle(shoulder, elbow, wrist)
            body_angle = calculate_angle(shoulder, hip, ankle)

            form_issues = []
            if body_angle < 155:
                form_issues.append("Keep your body straight — hips are sagging")
                self.form_quality = "bad"
            elif body_angle < 165:
                form_issues.append("Straighten your body a bit more")
                self.form_quality = "bad"
            else:
                self.form_quality = "good"

            if elbow_angle > 160:
                if self.stage == "down":
                    self.counter += 1
                    if self.form_quality == "good":
                        self.feedback = "Perfect rep! Great form!"
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

            if l_hip.visibility > r_hip.visibility:
                shoulder, hip, knee, ankle = l_shoulder, l_hip, l_knee, l_ankle
            else:
                shoulder, hip, knee, ankle = r_shoulder, r_hip, r_knee, r_ankle

            min_vis = min(shoulder.visibility, hip.visibility, knee.visibility, ankle.visibility)
            if min_vis < 0.4:
                self.feedback = "Please step fully into the frame"
                self.form_quality = "bad"
                return self.counter, self.feedback, self.stage, self.form_quality, []

            knee_angle = calculate_angle(hip, knee, ankle)
            back_angle = calculate_angle(shoulder, hip, knee)

            form_issues = []
            if back_angle < 60:
                form_issues.append("Don't lean forward too much — keep chest up")
                self.form_quality = "bad"
            else:
                self.form_quality = "good"

            if knee.x > ankle.x + 0.05:
                form_issues.append("Knees going too far forward")
                self.form_quality = "bad"

            if knee_angle > 160:
                if self.stage == "down":
                    self.counter += 1
                    if self.form_quality == "good":
                        self.feedback = "Perfect squat!"
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
        self.stage = "up"
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

            if l_hip.visibility > r_hip.visibility:
                shoulder, hip, knee = l_shoulder, l_hip, l_knee
            else:
                shoulder, hip, knee = r_shoulder, r_hip, r_knee

            min_vis = min(shoulder.visibility, hip.visibility, knee.visibility)
            if min_vis < 0.4:
                self.feedback = "Please step fully into the frame"
                self.form_quality = "bad"
                return self.counter, self.feedback, self.stage, self.form_quality, []

            torso_angle = calculate_angle(shoulder, hip, knee)

            self.form_quality = "good"
            form_issues = []

            if torso_angle < 40:
                form_issues.append("Don't come up too far — keep it a crunch, not a sit-up")
                self.form_quality = "bad"

            if torso_angle > 140:
                if self.stage == "up":
                    self.counter += 1
                    if self.form_quality == "good":
                        self.feedback = "Great crunch!"
                    else:
                        self.feedback = "Rep counted — control the movement"
                self.stage = "down"
                self.feedback = self.feedback if self.counter > 0 else "Curl up slowly"
            if torso_angle < 90:
                self.stage = "up"
                if self.form_quality == "good":
                    self.feedback = "Hold and squeeze! Now lower slowly"
                else:
                    self.feedback = " | ".join(form_issues) if form_issues else "Lower slowly"

            if self.stage == "down" and torso_angle <= 140 and torso_angle >= 90:
                self.feedback = "Curl up more — engage your core"

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


class PlankAnalyzer:
    def __init__(self):
        self.stage = "active"
        self.counter = 0
        self.feedback = "Hold a straight line from head to heels"
        self.form_quality = "good"
        self.hold_seconds = 0
        self.good_form_seconds = 0
        self._frame_count = 0

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

            if l_shoulder.visibility > r_shoulder.visibility:
                shoulder, hip, knee, ankle = l_shoulder, l_hip, l_knee, l_ankle
            else:
                shoulder, hip, knee, ankle = r_shoulder, r_hip, r_knee, r_ankle

            min_vis = min(shoulder.visibility, hip.visibility, knee.visibility, ankle.visibility)
            if min_vis < 0.4:
                self.feedback = "Please step fully into the frame"
                self.form_quality = "bad"
                self.stage = "broken"
                return self.counter, self.feedback, self.stage, self.form_quality, []

            body_angle = calculate_angle(shoulder, hip, ankle)

            self._frame_count += 1

            if body_angle > 160:
                self.form_quality = "good"
                self.stage = "active"
                if self._frame_count % 25 == 0:
                    self.hold_seconds += 1
                    self.good_form_seconds += 1
                self.feedback = f"Hold strong! {self.hold_seconds}s"
            elif body_angle > 140:
                self.form_quality = "bad"
                self.stage = "active"
                if self._frame_count % 25 == 0:
                    self.hold_seconds += 1
                self.feedback = "Straighten your body — hips are too high or low"
            else:
                self.form_quality = "bad"
                self.stage = "broken"
                self.feedback = "Form broken — hold a straight line"

            all_landmarks = {}
            for idx in PLANK_LANDMARKS:
                lm = landmarks[idx]
                all_landmarks[idx] = {"x": round(lm.x, 4), "y": round(lm.y, 4)}

            connections = []
            for (a_idx, b_idx) in PLANK_CONNECTIONS:
                connections.append({
                    "start": all_landmarks.get(a_idx, {"x": 0, "y": 0}),
                    "end": all_landmarks.get(b_idx, {"x": 0, "y": 0})
                })

        except Exception as e:
            self.feedback = "Position your side to the camera"
            self.form_quality = "bad"
            self.stage = "broken"
            connections = []

        return self.counter, self.feedback, self.stage, self.form_quality, connections
