import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';
import './App.css';
import './components/landing/landing.css'; // Make cinematic design system global

// Lazy-loaded routes — each page only downloads when navigated to
const Dashboard = lazy(() => import('./components/Dashboard'));
const Auth = lazy(() => import('./components/Auth'));
const Profile = lazy(() => import('./components/Profile'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const Friends = lazy(() => import('./components/Friends'));
const WorkoutAnalyzer = lazy(() => import('./components/WorkoutAnalyzer'));
const LandingPage = lazy(() => import('./components/landing/LandingPage'));
const Community = lazy(() => import('./components/Community'));
const Admin = lazy(() => import('./components/Admin'));
const BugReport = lazy(() => import('./components/BugReport'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-primary, #0a0a0d)'
    }}>
      <div className="loading-spinner" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div key={location.pathname} className={isLanding ? '' : 'page-transition-wrapper'}>
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workout" element={<WorkoutAnalyzer />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/community" element={<Community />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/report-bug" element={<BugReport />} />
        </Routes>
      </Suspense>
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

