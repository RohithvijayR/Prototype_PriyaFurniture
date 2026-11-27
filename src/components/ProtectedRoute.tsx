import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Guards authenticated account routes without causing false redirects during
 * initial Firebase Auth session restoration (e.g. on direct URL load or refresh).
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <main className="bg-[#F5F0E8] min-h-[78vh] pt-32 pb-20 flex items-center justify-center px-5">
        <div
          role="status"
          aria-live="polite"
          className="bg-white border border-[#D9CBB8] rounded-3xl px-8 py-7 flex items-center gap-3.5 text-sm text-[#202735] shadow-[0_18px_40px_-24px_rgba(32,39,53,0.14)]"
        >
          <Loader2 className="w-4 h-4 animate-spin text-[#9B4D17]" aria-hidden="true" />
          <span>Restoring your Priya Furniture account session...</span>
        </div>
      </main>
    );
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: returnTo }} />;
  }

  return <>{children}</>;
}
