import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import UsersList from './UsersList';
import AdminSettings from './AdminSettings';
import SubscriptionsManagement from './SubscriptionsManagement';
import './Admin.scss';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus?: string;
  referenceNumber?: string;
  createdAt?: string;
  lastLogin?: string;
}

enum AdminTab {
  DASHBOARD = 'dashboard',
  USERS = 'users',
  SUBSCRIPTIONS = 'subscriptions',
  SETTINGS = 'settings'
}

// Dashboard summary component for the main admin panel view
const DashboardSummary = () => {
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['adminDashboardUsers'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data.data.users;
    }
  });

  const calculateAverageTimeOnPlatform = (users: User[]) => {
    if (!users.length) return 0;

    const now = new Date();
    let totalDays = 0;

    users.forEach(user => {
      if (user.createdAt) {
        const createdDate = new Date(user.createdAt);
        const diffTime = Math.abs(now.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
      }
    });

    return Math.round(totalDays / users.length);
  };
  
  const totalUsers = users.length;
  const paidUsers = users.filter((user: User) => 
    user.subscriptionStatus?.toLowerCase() === 'active' || 
    user.subscriptionStatus?.toLowerCase() === 'paid'
  ).length;
  const trialUsers = users.filter((user: User) => 
    user.subscriptionStatus?.toLowerCase() === 'trial'
  ).length;
  const avgTimeOnPlatform = calculateAverageTimeOnPlatform(users);

  if (isLoading) {
    return <div className="loading-state">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="error-state">Error loading dashboard data. Please try again.</div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      <div className="dashboard-summary">
        <div className="summary-stats">
          <div className="stat-box">
            <h3>Total Users</h3>
            <p>{totalUsers}</p>
          </div>
          <div className="stat-box">
            <h3>Paid Subscriptions</h3>
            <p>{paidUsers}</p>
            <span className="stat-subtitle">{Math.round((paidUsers / totalUsers) * 100) || 0}% of total</span>
          </div>
          <div className="stat-box">
            <h3>Trial Users</h3>
            <p>{trialUsers}</p>
            <span className="stat-subtitle">{Math.round((trialUsers / totalUsers) * 100) || 0}% of total</span>
          </div>
          <div className="stat-box">
            <h3>Avg. Days on Platform</h3>
            <p>{avgTimeOnPlatform}</p>
            <span className="stat-subtitle">per user</span>
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
          {activeTab === AdminTab.SUBSCRIPTIONS && <SubscriptionsManagement />}
          {activeTab === AdminTab.SETTINGS && <AdminSettings />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 