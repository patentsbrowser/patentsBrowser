import { useAuth } from '../../AuthContext';
import { useAdmin } from '../../context/AdminContext';
import { useEffect, useState } from 'react';
import './ModeSwitcher.scss';

const ModeSwitcher = () => {
  const { user, adminCheckPerformed } = useAuth();
  const { isAdminMode, toggleAdminMode, setAdminMode } = useAdmin();

  // Add debugging logs
  console.log('ModeSwitcher - User:', user);
  console.log('ModeSwitcher - Is admin from user:', user?.isAdmin);
  console.log('ModeSwitcher - Admin mode:', isAdminMode);
  console.log('ModeSwitcher - Admin check performed:', adminCheckPerformed);

  // Force user mode on initial render
  useEffect(() => {
    // Ensure users always start in user mode
    if (isAdminMode) {
      console.log('ModeSwitcher - Forcing user mode on initial render');
      setAdminMode(false);
    }
  }, []);

  // Only show the switcher if the user has admin privileges
  if (!user?.isAdmin) {
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