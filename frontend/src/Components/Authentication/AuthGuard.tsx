import { Navigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { checkAuth } = useAuth();

  // Check if the user is authenticated using our improved method
  const isAuthenticated = checkAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // Render children if authenticated
  return <>{children}</>;
}; 