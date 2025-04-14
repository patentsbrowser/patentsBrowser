import { useState } from 'react';
import UsersList from './UsersList';
import './Admin.scss';

enum AdminTab {
  USERS = 'users',
  SUBSCRIPTIONS = 'subscriptions',
  SETTINGS = 'settings'
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.USERS);

  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <div className="admin-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-nav">
          <button 
            className={`admin-nav-item ${activeTab === AdminTab.USERS ? 'active' : ''}`}
            onClick={() => setActiveTab(AdminTab.USERS)}
          >
            <span className="icon">👥</span>
            Users
          </button>
          <button 
            className={`admin-nav-item ${activeTab === AdminTab.SUBSCRIPTIONS ? 'active' : ''}`}
            onClick={() => setActiveTab(AdminTab.SUBSCRIPTIONS)}
          >
            <span className="icon">💎</span>
            Subscriptions
          </button>
          <button 
            className={`admin-nav-item ${activeTab === AdminTab.SETTINGS ? 'active' : ''}`}
            onClick={() => setActiveTab(AdminTab.SETTINGS)}
          >
            <span className="icon">⚙️</span>
            Settings
          </button>
        </nav>
      </div>
      
      <div className="admin-content">
        {activeTab === AdminTab.USERS && <UsersList />}
        {activeTab === AdminTab.SUBSCRIPTIONS && (
          <div className="admin-section">
            <h1>Subscriptions Management</h1>
            <p>Subscription management features will be implemented here.</p>
          </div>
        )}
        {activeTab === AdminTab.SETTINGS && (
          <div className="admin-section">
            <h1>Admin Settings</h1>
            <p>Admin settings features will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 