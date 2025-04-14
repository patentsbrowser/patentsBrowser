import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.scss';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../AuthContext';

const Sidebar = () => {
  const { isAdminMode } = useAdmin();
  const { user } = useAuth();
  
  // Debug logs
  console.log('Sidebar - User:', user);
  console.log('Sidebar - Is user admin?', !!user?.isAdmin);
  console.log('Sidebar - Is admin mode active?', isAdminMode);
  
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

  // Only show admin menu items if both conditions are true:
  // 1. User has admin role
  // 2. Admin mode is explicitly toggled on
  const shouldShowAdminMenu = user?.isAdmin === true && isAdminMode === true;
  console.log('Sidebar - Should show admin menu?', shouldShowAdminMenu);
  
  // Always default to user menu items unless explicitly in admin mode
  const menuItems = shouldShowAdminMenu ? adminMenuItems : userMenuItems;

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