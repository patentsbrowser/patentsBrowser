import { Navigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    const token = localStorage.getItem('token');
    console.log('token', token)
    if (!token) {
      return <Navigate to="/" replace />;
    }}
  // Render children if authenticated
  return <>{children}</>;
}; 