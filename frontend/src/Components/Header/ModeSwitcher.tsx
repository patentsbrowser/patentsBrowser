import { useAuth } from '../../AuthContext';
import { useAdmin } from '../../context/AdminContext';
import { useEffect, useState } from 'react';
import './ModeSwitcher.scss';

const ModeSwitcher = () => {
  const { user } = useAuth();
  const { isAdminMode, toggleAdminMode, setAdminMode } = useAdmin();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Add debugging logs
  console.log('ModeSwitcher - User:', user);
  console.log('ModeSwitcher - Is admin from user:', user?.isAdmin);
  console.log('ModeSwitcher - Admin mode:', isAdminMode);

  // Check admin status from API directly
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const { authApi } = await import('../../api/auth');
          const result = await authApi.checkAdminStatus();
          console.log('ModeSwitcher - Admin API check result:', result);
          setIsAdmin(result.isAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          // Fallback to user object if API fails
          setIsAdmin(!!user?.isAdmin);
        }
      } else {
        // No user means not admin
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [user]);

  // Force user mode on initial render
  useEffect(() => {
    // Ensure users always start in user mode
    if (isAdminMode) {
      console.log('ModeSwitcher - Forcing user mode on initial render');
      setAdminMode(false);
    }
  }, []);

  // Only show the switcher if the user has admin privileges
  if (!isAdmin) {
    console.log('ModeSwitcher - Not showing switcher (not admin)');
    return null;
  }

  return (
    <div className="mode-switcher">
      <label className="mode-switcher-label">View Mode:</label>
      <div 
        className={`mode-option ${!isAdminMode ? 'active' : ''}`}
        onClick={() => isAdminMode && toggleAdminMode()}
        title="Switch to user interface"
      >
        User
      </div>
      <div 
        className={`mode-option ${isAdminMode ? 'active' : ''}`}
        onClick={() => !isAdminMode && toggleAdminMode()}
        title="Switch to admin interface"
      >
        Admin
      </div>
    </div>
  );
};

export default ModeSwitcher; 