import { Navigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { useEffect, useState } from 'react';
import Loader from '../Common/Loader';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { checkAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status
    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);
    setIsLoading(false);
  }, [checkAuth]);

  if (isLoading) {
    return <Loader fullScreen text="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <>{children}</>;
}; 