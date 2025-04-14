import { NavLink } from 'react-router-dom';
import './Sidebar.scss';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../AuthContext';

const Sidebar = () => {
  const { isAdminMode } = useAdmin();
  const { user } = useAuth();
  
  const userMenuItems = [
    { path: '/auth/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/auth/patent-history', label: 'Patent History', icon: '🕒' },
    { path: '/auth/patentSaver', label: 'Saved Patents', icon: '📑' },
    { path: '/auth/subscription', label: 'Subscription', icon: '💎' },
    { path: '/auth/settings', label: 'Settings', icon: '📝' },
    { path: '/auth/update-profile', label: 'Update Profile', icon: '👤' },
  ];

  const adminMenuItems = [
    { path: '/auth/admin', label: 'Admin Dashboard', icon: '⚙️' },
    { path: '/auth/admin/users', label: 'Users', icon: '👥' },
    { path: '/auth/admin/subscriptions', label: 'Subscriptions', icon: '💰' },
    { path: '/auth/admin/settings', label: 'Admin Settings', icon: '🔧' },
  ];

  // Determine which menu items to show based on mode
  const menuItems = isAdminMode ? adminMenuItems : userMenuItems;

  return (
    <div className="sidebar">
      {user?.isAdmin && (
        <div className="mode-indicator">
          <span>{isAdminMode ? 'Admin Mode' : 'User Mode'}</span>
        </div>
      )}
      <nav>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 