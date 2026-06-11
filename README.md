<div align="center">
  
  # 🏆 MotionRank AI
  
  **The ultimate AI-powered fitness form analyzer & real-time voice coach.**  
  Track your performance, perfect your form, and compete globally.

  <p align="center">
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Python-14354C?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/OpenCV-27338e?style=for-the-badge&logo=OpenCV&logoColor=white" alt="OpenCV" />
    <img src="https://img.shields.io/badge/Firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  </p>

</div>

---

## ⚡ Overview

**MotionRank AI** is a state-of-the-art web application that turns your webcam into a personal fitness trainer. By utilizing MediaPipe's skeletal tracking and Google's Gemini AI, the app analyzes your exercise form in real-time, counts your reps, and provides instantaneous, multi-lingual audio feedback to ensure you're performing at your peak.

Packed in a gorgeous, responsive, glassmorphic UI, MotionRank AI is designed to make fitness tracking immersive and highly competitive.

---

## ✨ Key Features

### 👁️ Real-Time Computer Vision
* **Skeletal Tracking:** Uses MediaPipe & OpenCV to map your body joints in 3D space with zero latency.
* **Smart Form Checking:** Calculates exact joint angles to ensure proper depth on squats, straight backs on push-ups, and perfect crunches.
* **Frame Validation:** Ensures you are fully visible in the camera before starting the analysis, rendering a glowing green or red skeleton on-screen.

### 🎙️ AI Voice Coach & Personas
* **Live Audio Feedback:** Tells you when your form breaks down (e.g., "Keep your back straight!", "Go lower!") and motivates you on milestones.
* **Multi-Lingual Personas:** Choose from multiple voice personas (Sara, Joe, Carlos, Priya) across English, Hindi, French, Spanish, and more.

### 🧠 Gemini AI Integration
* Uses the Google Gemini API to analyze raw spatial feedback and generate punchy, highly personalized coaching tips on the fly, directly overlaid on your workout screen.

### 📊 Gamified Dashboard
* **LeetCode-style Heatmap:** Visualize your consistency with a 12-week activity heatmap.
* **Performance Radar Chart:** See your skill distribution dynamically across different workout types.
* **Leaderboard & Podium:** Compete with friends. Top 3 athletes are displayed on a stunning visual podium.

---

## 🚀 Tech Stack

| Domain | Technology |
|---|---|
| **Frontend** | React (Vite), Recharts, React-Calendar-Heatmap, Lucide-React |
| **Backend** | Python, FastAPI, Uvicorn, OpenCV, MediaPipe |
| **Database & Auth** | Firebase Authentication & Firestore |
| **AI / ML** | Google Gemini API (LLM Coaching) |
| **Media** | Cloudinary (Profile Pictures) |

---

## 💻 Running Locally

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* Firebase project (Web API Keys)
* Cloudinary Account (Optional, for profile pics)

### 1. Backend Setup (FastAPI)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server (runs on port 8000)
python main.py
```

### 2. Frontend Setup (React)
```bash
cd frontend

# Install dependencies
npm install

# Configure Environment Variables
# Create a .env file based on the config below

# Start the development server (runs on port 5173)
npm run dev
```

### 3. Environment Variables (`frontend/.env`)
Create a `.env` file in the `frontend` folder with your keys:
```env
# Backend API URL
VITE_API_URL=http://localhost:8000

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary (For User Avatars)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset

# Gemini API (For AI Coaching)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

## 🎨 Design System

MotionRank AI is built from the ground up using vanilla CSS, rejecting component libraries in favor of a bespoke, deeply customized **Glassmorphic Aesthetic**. 
* **Dynamic Backgrounds:** Slow-moving, contextual gradient blobs that react to the exercise type.
* **Skeuomorphic Touches:** Buttons that feel tactile and responsive.
* **Micro-interactions:** Staggered list animations, smooth scaling modals, and hover state transitions.

---

## 🔒 Privacy & Architecture

* **Local Processing:** The heavy lifting of the LLM and Voice Synthesis happens entirely in the browser. 
* **API Key Safety:** Your Gemini API Key can be entered safely in your profile panel and is stored entirely locally in `localStorage`, meaning it is never transmitted to our backend.
* **Stateless Tracking:** The backend pose-estimator doesn't save your camera feed; frames are processed strictly in-memory and discarded.

---

<div align="center">
  <b>Built with passion to merge computer vision with human potential.</b><br>
  Happy Training! 💪
</div>
