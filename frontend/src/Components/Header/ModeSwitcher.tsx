import { useAuth } from '../../AuthContext';
import { useAdmin } from '../../context/AdminContext';
import './ModeSwitcher.scss';

const ModeSwitcher = () => {
  const { user } = useAuth();
  const { isAdminMode, toggleAdminMode } = useAdmin();

  // Only show the switcher if the user has admin privileges
  if (!user?.isAdmin) {
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