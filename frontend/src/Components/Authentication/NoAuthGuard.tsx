import { Navigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

interface NoAuthGuardProps {
  children: React.ReactNode;
}

export const NoAuthGuard = ({ children }: NoAuthGuardProps) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    console.log('isAuthenticated1', isAuthenticated)
    const token = localStorage.getItem('token');
    console.log('token', token)
    if (!token) {
      return <Navigate to="/" replace />;
    }
  }
  // Render children if not authenticated
  return <>{children}</>;
}; 