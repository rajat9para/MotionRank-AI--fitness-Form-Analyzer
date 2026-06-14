import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import ErrorBoundary from './ErrorBoundary';
import LoadingScreen from './LoadingScreen';
import LandingNav from './LandingNav';
import Hero from './Hero';
import { Marquee, AICoach, Features, Transformation, Testimonial, FinalCTA } from './Sections';
import Footer from './Footer';
import './landing.css';

export default function Landing() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lock scroll while the cinematic intro plays
    document.body.style.overflow = loading ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [loading]);

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {loading && <LoadingScreen onDone={() => setLoading(false)} />}
      </AnimatePresence>

      <div className="mr-cine">
        <div className="mr-grain" aria-hidden="true" />
        <LandingNav />
        <Hero />
        <Marquee />
        <AICoach />
        <Features />
        <Transformation />
        <Testimonial />
        <FinalCTA />
        <Footer />
      </div>
    </>
  );
}
