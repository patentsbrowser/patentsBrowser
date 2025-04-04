import { Navigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

interface NoAuthGuardProps {
  children: React.ReactNode;
}

export const NoAuthGuard = ({ children }: NoAuthGuardProps) => {
  const { checkAuth } = useAuth();

  // Check if the user is authenticated using our improved method
  const isAuthenticated = checkAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/auth/dashboard" replace />;
  }
  
  // Render children if not authenticated
  return <>{children}</>;
}; 