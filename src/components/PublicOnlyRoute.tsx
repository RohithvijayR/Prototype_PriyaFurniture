import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PublicOnlyRouteProps {
  children: ReactNode;
}

/**
 * Redirects already-authenticated users away from /login and /register to their
 * requested destination (or /account) once session restoration completes.
 */
export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <main className="bg-[#F5F0E8] min-h-[78vh] pt-32 pb-20 flex items-center justify-center px-5">
        <div
          role="status"
          aria-live="polite"
          className="bg-white border border-[#D9CBB8] rounded-3xl px-8 py-7 flex items-center gap-3.5 text-sm text-[#202735]"
        >
          <Loader2 className="w-4 h-4 animate-spin text-[#9B4D17]" aria-hidden="true" />
          <span>Checking account session...</span>
        </div>
      </main>
    );
  }

  if (user) {
    const state = location.state as { from?: string } | null;
    const target =
      typeof state?.from === 'string' &&
      state.from.startsWith('/') &&
      !state.from.startsWith('//') &&
      state.from !== '/login' &&
      state.from !== '/register'
        ? state.from
        : '/account';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
