import { Navigate, useSearchParams } from 'react-router-dom';

/** Preserve existing draft links while assisted listing is paused. */
export default function ListWithVendi() {
  const [params] = useSearchParams();
  const listing = params.get('listing');
  if (listing) return <Navigate to={`/create-listing/${encodeURIComponent(listing)}`} replace />;
  const next = new URLSearchParams(params);
  next.delete('path');
  return <Navigate to={`/list/start${next.size ? '?' + next.toString() : ''}`} replace />;
}
