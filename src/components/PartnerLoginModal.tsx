import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, ArrowRight, Building2 } from 'lucide-react';
import { EDITORIAL_EASE } from './MotionPrimitives';

interface PartnerLoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function PartnerLoginModal({ open, onClose }: PartnerLoginModalProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="partner-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#202735]/55 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-portal-title"
          onClick={onClose}
        >
          <motion.div
            key="partner-modal-card"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.28, ease: EDITORIAL_EASE }}
            className="w-full max-w-md rounded-3xl liquid-glass-light p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close trade portal dialog"
              className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-[#586070] hover:text-[#202735] hover:bg-[#202735]/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-[#9B4D17] font-medium mb-3">
              <Building2 className="w-4 h-4" aria-hidden="true" />
              <span>Trade & Institutional Portal</span>
            </div>

            <h2
              id="partner-portal-title"
              className="font-display text-2xl font-medium text-[#202735] mb-3"
            >
              Partner Account Access
            </h2>

            <p className="text-sm text-[#586070] leading-relaxed mb-6">
              Direct portal sign-in is provisioned for registered architects, hospital procurement
              desks, and institutional buyers with active framework agreements.
            </p>

            <div className="rounded-2xl bg-white/75 border border-[#D9CBB8]/80 p-4 mb-6 text-sm text-[#202735] space-y-1.5">
              <p className="font-medium">No account required for project quotations</p>
              <p className="text-xs text-[#586070] leading-relaxed">
                You can browse the full specification catalogue and submit multi-item bulk
                quotation requests directly without signing in.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to="/quote"
                onClick={onClose}
                className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors whitespace-nowrap"
              >
                <span>Request a Quote</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-full text-[#202735] bg-white/60 border border-[#202735]/15 hover:border-[#202735] transition-colors whitespace-nowrap cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
