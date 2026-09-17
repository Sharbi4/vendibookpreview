import { Navigate, useLocation, useParams } from 'react-router-dom';

/** /messages/:conversationId → /dashboard/messages/:conversationId (thread preserved). */
export default function LegacyMessageThreadRedirect() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { search, hash } = useLocation();
  return <Navigate to={`/dashboard/messages/${conversationId ?? ''}${search}${hash}`} replace />;
}
