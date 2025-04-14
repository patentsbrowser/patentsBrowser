import { useAuth } from '../../AuthContext';
import { useAdmin } from '../../context/AdminContext';
import './ModeSwitcher.scss';
import { useEffect, useState } from 'react';

const ModeSwitcher = () => {
  const { user } = useAuth();
  const { isAdminMode, toggleAdminMode } = useAdmin();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Add debugging logs
  console.log('ModeSwitcher - User:', user);
  console.log('ModeSwitcher - Is admin from user:', user?.isAdmin);
  
  useEffect(() => {
    // Additional check from localStorage as a backup
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('ModeSwitcher - User from localStorage:', userData);
        console.log('ModeSwitcher - Is admin from localStorage:', userData?.isAdmin);
        
        setIsAdmin(!!userData?.isAdmin);
      }
    } catch (error) {
      console.error('Error checking admin status from localStorage:', error);
    }
  }, [user]);

  console.log('ModeSwitcher - Final admin status:', isAdmin);
  console.log('ModeSwitcher - Admin mode:', isAdminMode);

  // Only show the switcher if the user has admin privileges
  if (!isAdmin && !user?.isAdmin) {
    console.log('ModeSwitcher - Not showing switcher (not admin)');
    return null;
  }

  return (
    <div className="mode-switcher">
      <div 
        className={`mode-option ${!isAdminMode ? 'active' : ''}`}
        onClick={() => isAdminMode && toggleAdminMode()}
      >
        User
      </div>
      <div 
        className={`mode-option ${isAdminMode ? 'active' : ''}`}
        onClick={() => !isAdminMode && toggleAdminMode()}
      >
        Admin
      </div>
    </div>
  );
};

export default ModeSwitcher; 