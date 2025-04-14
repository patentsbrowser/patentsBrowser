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
  
  // Add debugging logs
  console.log('AdminGuard - User:', user);
  console.log('AdminGuard - Is authenticated:', isAuthenticated);
  console.log('AdminGuard - Is admin:', user?.isAdmin);
  console.log('AdminGuard - Admin mode:', isAdminMode);
  
  // First check if user is authenticated
  if (!isAuthenticated) {
    console.log('AdminGuard - Redirecting to login (not authenticated)');
    return <Navigate to="/auth/login" />;
  }
  
  // Then check if user is an admin and in admin mode
  if (!user?.isAdmin || !isAdminMode) {
    console.log('AdminGuard - Redirecting to dashboard (not admin or not in admin mode)');
    return <Navigate to="/auth/dashboard" />;
  }
  
  console.log('AdminGuard - Access granted');
  // User is authenticated and has admin privileges, allow access
  return <>{children}</>;
}; 