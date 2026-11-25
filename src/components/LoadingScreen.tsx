import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EDITORIAL_EASE } from './MotionPrimitives';

interface LoadingScreenProps {
  visible: boolean;
  onComplete: () => void;
}

export function LoadingScreen({ visible, onComplete }: LoadingScreenProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    const duration = prefersReducedMotion ? 220 : 1150;
    const timer = window.setTimeout(() => {
      onComplete();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [visible, onComplete, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="priya-preloader"
          role="status"
          aria-live="polite"
          aria-label="Loading Priya Furniture"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: prefersReducedMotion ? 0.15 : 0.55, ease: EDITORIAL_EASE },
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#202735] px-6 select-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 44%, rgba(217, 203, 184, 0.1) 0%, rgba(32, 39, 53, 0) 62%)',
          }}
        >
          <div className="w-full max-w-xs flex flex-col items-center text-center">
            {/* Subtle architectural monogram mark */}
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EDITORIAL_EASE }}
              className="w-10 h-10 mb-5 rounded-full border border-[#D9CBB8]/35 flex items-center justify-center text-[#D9CBB8]"
              aria-hidden="true"
            >
              <span className="font-display text-base tracking-tight">P</span>
            </motion.div>

            {/* Masked Wordmark Reveal */}
            <div className="overflow-hidden pb-1">
              <motion.p
                initial={prefersReducedMotion ? { opacity: 1 } : { y: '105%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ duration: 0.62, delay: 0.08, ease: EDITORIAL_EASE }}
                className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-white"
              >
                Priya Furniture
              </motion.p>
            </div>

            <motion.p
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: EDITORIAL_EASE }}
              className="mt-2 text-xs text-[#D9CBB8]/80 tracking-wide"
            >
              Architectural & Institutional Furniture
            </motion.p>

            {/* Minimal Hairline Progress Track */}
            <div className="mt-8 w-44 h-[1.5px] bg-white/12 overflow-hidden rounded-full">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: prefersReducedMotion ? 0.15 : 0.95,
                  delay: 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformOrigin: 'left center' }}
                className="w-full h-full bg-gradient-to-r from-[#D9CBB8] via-[#F5F0E8] to-[#9B4D17]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
