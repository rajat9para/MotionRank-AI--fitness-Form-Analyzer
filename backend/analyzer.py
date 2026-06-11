import math
import numpy as np
import mediapipe as mp

mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    """
    Calculate angle between three points (a, b, c) where b is the vertex.
    Each point is a mediapipe landmark with x, y coordinates.
    """
    a = np.array([a.x, a.y]) # First
    b = np.array([b.x, b.y]) # Mid
    c = np.array([c.x, c.y]) # End
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
        
    return angle

class PushUpAnalyzer:
    def __init__(self):
        self.stage = "up"
        self.counter = 0
        self.feedback = "Ready"

    def analyze(self, landmarks):
        try:
            # Get coordinates
            shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            elbow = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value]
            wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
            
            # Calculate angle
            angle = calculate_angle(shoulder, elbow, wrist)
            
            # Logic
            if angle > 160:
                if self.stage == "down":
                    self.counter += 1
                    self.feedback = "Good rep!"
                self.stage = "up"
            if angle < 90:
                self.stage = "down"
                self.feedback = "Push up!"
                
        except Exception as e:
            self.feedback = "Landmarks not fully visible"
            pass

        return self.counter, self.feedback, self.stage


class SquatAnalyzer:
    def __init__(self):
        self.stage = "up"
        self.counter = 0
        self.feedback = "Ready"

    def analyze(self, landmarks):
        try:
            # Get coordinates
            hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
            ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
            
            # Calculate angle
            angle = calculate_angle(hip, knee, ankle)
            
            # Logic
            if angle > 160:
                if self.stage == "down":
                    self.counter += 1
                    self.feedback = "Good rep!"
                self.stage = "up"
            if angle < 100:  # Below parallel
                self.stage = "down"
                self.feedback = "Stand up!"
                
        except Exception as e:
            self.feedback = "Landmarks not fully visible"
            pass

        return self.counter, self.feedback, self.stage
