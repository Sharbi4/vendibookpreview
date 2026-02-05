// Redirect to the main host explainer page
import { Navigate } from 'react-router-dom';

const BecomeAHost = () => {
  return <Navigate to="/how-it-works-host" replace />;
};

export default BecomeAHost;