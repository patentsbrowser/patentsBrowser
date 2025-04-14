import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UsersList from './UsersList';
import './Admin.scss';

enum AdminTab {
  USERS = 'users',
  SUBSCRIPTIONS = 'subscriptions',
  SETTINGS = 'settings'
}

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.USERS);

  // Determine the active tab based on the URL path
  useEffect(() => {
    if (location.pathname.includes('/admin/subscriptions')) {
      setActiveTab(AdminTab.SUBSCRIPTIONS);
    } else if (location.pathname.includes('/admin/settings')) {
      setActiveTab(AdminTab.SETTINGS);
    } else {
      setActiveTab(AdminTab.USERS);
    }
  }, [location.pathname]);

  return (
    <div className="admin-dashboard">
      <div className="admin-content">
        <div className="admin-header">
          <h2>Admin Panel</h2>
        </div>
        
        <div className="admin-section">
          {activeTab === AdminTab.USERS && <UsersList />}
          {activeTab === AdminTab.SUBSCRIPTIONS && (
            <div>
              <h1>Subscriptions Management</h1>
              <p>Subscription management features will be implemented here.</p>
            </div>
          )}
          {activeTab === AdminTab.SETTINGS && (
            <div>
              <h1>Admin Settings</h1>
              <p>Admin settings features will be implemented here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 