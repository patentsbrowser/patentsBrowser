import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../../AuthContext';
import { useAdmin } from '../../context/AdminContext';

interface AdminGuardProps {
  children: ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  const { user, isAuthenticated } = useAuth();
  const { isAdminMode } = useAdmin();
  
  // First check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" />;
  }
  
  // Then check if user is an admin and in admin mode
  if (!user?.isAdmin || !isAdminMode) {
    return <Navigate to="/auth/dashboard" />;
  }
  
  // User is authenticated and has admin privileges, allow access
  return <>{children}</>;
}; 