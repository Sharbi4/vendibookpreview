import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  /**
   * Optional branded gate rendered instead of redirecting to /auth.
   * Used where the sign-in experience is part of the product surface.
   */
  fallback?: React.ReactNode;
  /** Where to send unauthenticated users when no fallback is provided. */
  redirectTo?: string;
}

/**
 * Route-level authentication guard. Unauthenticated visitors never reach the
 * protected element tree, so no draft, interview state, or upload control is
 * mounted for them. Server-side enforcement (edge function JWT checks + RLS)
 * remains the source of truth; this is the client-side complement.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ children, fallback, redirectTo = '/auth' }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#08080a]">
        <Loader2 className="h-5 w-5 animate-spin text-white/50" aria-label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    if (fallback) return <>{fallback}</>;
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`${redirectTo}?redirect=${returnTo}`} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
