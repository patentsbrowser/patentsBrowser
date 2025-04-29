import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.scss';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../AuthContext';

const Sidebar = () => {
  const { isAdminMode } = useAdmin();
  const { user } = useAuth();
  const location = useLocation();
  
  const userMenuItems = [
    { path: '/auth/dashboard', label: 'Dashboard', icon: '📊', exact: false },
    { path: '/auth/patent-history', label: 'Patent History', icon: '🕒', exact: false },
    { path: '/auth/patentSaver', label: 'Upload Files', icon: '📑', exact: false },
    { path: '/auth/subscription', label: 'Subscription', icon: '💎', exact: false },
    { path: '/auth/payment-history', label: 'Payment History', icon: '💳', exact: false },
    { path: '/auth/update-profile', label: 'Update Profile', icon: '👤', exact: false },
    { path: '/auth/settings', label: 'Settings', icon: '📝', exact: false },
  ];

  const adminMenuItems = [
    { path: '/auth/dashboard', exact: true, label: 'Admin Dashboard', icon: '⚙️' },
    { path: '/auth/admin/users', label: 'Manage Users', icon: '👥' },
    { path: '/auth/admin/subscriptions', label: 'Subscriptions', icon: '💰' },
    { path: '/auth/admin/settings', label: 'Admin Settings', icon: '🔧' },
  ];

  // Only show admin menu items if both conditions are true:
  // 1. User has admin role
  // 2. Admin mode is explicitly toggled on
  const shouldShowAdminMenu = user?.isAdmin && isAdminMode;
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
            className={({ isActive }) => {
              // For items marked as exact, only highlight if path matches exactly
              if (item.exact) {
                return location.pathname === item.path ? 'active' : '';
              }
              // For other items, use the default isActive from NavLink
              return isActive ? 'active' : '';
            }}
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