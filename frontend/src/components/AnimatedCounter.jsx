import { useState, useEffect, useRef } from 'react';

/**
 * Counts up from 0 to `value` with an ease-out cubic curve.
 * Re-animates whenever `value` changes.
 */
export default function AnimatedCounter({ value = 0, duration = 900, suffix = '', prefix = '' }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
