import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollRouteState {
  scrollTo?: string;
  scrollTrigger?: number;
}

export function ScrollToTop() {
  const { pathname, hash, state } = useLocation();
  const routeState = (state as ScrollRouteState | null) ?? null;

  useEffect(() => {
    const targetId = routeState?.scrollTo || (hash ? hash.replace(/^#/, '') : '');

    if (!targetId) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 40; // ~1.6s total window to outlast 320ms AnimatePresence exit
    let timerId: number | null = null;

    const scrollToTarget = () => {
      if (cancelled) return;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      attempt += 1;
      if (attempt < maxAttempts) {
        timerId = window.setTimeout(scrollToTarget, 40);
      }
    };

    // Run on next animation frame, then poll briefly if waiting for AnimatePresence mount.
    const rafId = window.requestAnimationFrame(scrollToTarget);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [pathname, hash, routeState?.scrollTo, routeState?.scrollTrigger]);

  return null;
}
