import { Navigate, useLocation } from 'react-router-dom';

/** All listing entry points use the step-by-step wizard while Vendi is paused. */
export default function ListingStart() {
  const { search } = useLocation();
  return <Navigate to={`/list/start${search}`} replace />;
}
