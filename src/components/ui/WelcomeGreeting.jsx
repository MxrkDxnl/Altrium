import { useState, useEffect } from 'react';
import AltriumLogo from './AltriumLogo';

export default function WelcomeGreeting({ name, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Respect reduced-motion preferences
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Small delay to trigger smooth entry transition
    const enterTimer = setTimeout(() => {
      setVisible(true);
    }, prefersReducedMotion ? 0 : 40);

    // Trigger exit transition at ~3400ms (doubled display time)
    const exitTimer = setTimeout(() => {
      setVisible(false);
    }, prefersReducedMotion ? 3800 : 3400);

    // Cleanup and complete dismissal at ~4000ms
    const dismissTimer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 4000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        Welcome back, {name}
      </div>

      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-2'
        }`}
      >
        <div className="bg-gray-950/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <AltriumLogo className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">
              Altrium Performance Tracker
            </p>
            <p className="text-sm font-medium text-gray-100">
              Welcome back, <span className="font-bold text-white">{name}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
