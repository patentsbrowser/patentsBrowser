import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import UsersList from './UsersList';
import AdminSettings from './AdminSettings';
import './Admin.scss';

enum AdminTab {
  DASHBOARD = 'dashboard',
  USERS = 'users',
  SUBSCRIPTIONS = 'subscriptions',
  SETTINGS = 'settings'
}

// Dashboard summary component for the main admin panel view
const DashboardSummary = () => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      <div className="dashboard-summary">
        <div className="summary-stats">
          <div className="stat-box">
            <h3>Total Users</h3>
            <p>2</p>
          </div>
          <div className="stat-box">
            <h3>Active Subscriptions</h3>
            <p>0</p>
          </div>
          <div className="stat-box">
            <h3>Trial Users</h3>
            <p>2</p>
          </div>
        </div>
        
        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <p>No recent activity to display</p>
          </div>
        </div>
        
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn">Manage Users</button>
            <button className="action-btn">View Subscriptions</button>
            <button className="action-btn">System Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.DASHBOARD);

  // Determine the active tab based on the URL path
  useEffect(() => {
    if (location.pathname.includes('/auth/admin/users')) {
      setActiveTab(AdminTab.USERS);
    } else if (location.pathname.includes('/auth/admin/subscriptions')) {
      setActiveTab(AdminTab.SUBSCRIPTIONS);
    } else if (location.pathname.includes('/auth/admin/settings')) {
      setActiveTab(AdminTab.SETTINGS);
    } else if (location.pathname === '/auth/dashboard') {
      // Main dashboard path
      setActiveTab(AdminTab.DASHBOARD);
    }
  }, [location.pathname]);

  return (
    <div className="admin-dashboard">
      <div className="admin-content">
        <div className="admin-header">
          <h2>Admin Panel</h2>
        </div>
        
        <div className="admin-section">
          {activeTab === AdminTab.DASHBOARD && <DashboardSummary />}
          {activeTab === AdminTab.USERS && <UsersList />}
          {activeTab === AdminTab.SUBSCRIPTIONS && (
            <div>
              <h1>Subscriptions Management</h1>
              <p>Subscription management features will be implemented here.</p>
            </div>
          )}
          {activeTab === AdminTab.SETTINGS && (
            <AdminSettings />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 