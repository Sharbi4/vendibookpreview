import { Navigate, useLocation } from 'react-router-dom';

/**
 * Redirect that keeps the query string intact — used for campaign deep links
 * such as /dashboard/listings?boost=<id>&utm_… → /host/listings?boost=<id>&utm_…
 */
export default function PreserveQueryRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}
