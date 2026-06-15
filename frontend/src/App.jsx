import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import Friends from './components/Friends';
import WorkoutAnalyzer from './components/WorkoutAnalyzer';
import LandingPage from './components/landing/LandingPage';
import './App.css';

function AnimatedRoutes() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div key={location.pathname} className={isLanding ? '' : 'page-transition-wrapper'}>
      <Routes location={location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workout" element={<WorkoutAnalyzer />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/friends" element={<Friends />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
