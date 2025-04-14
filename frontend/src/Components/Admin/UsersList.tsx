import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './Admin.scss';
import UserProfileModal from './UserProfileModal';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus?: string;
  createdAt?: string;
  lastLogin?: string;
}

const UsersList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['adminUsers'],
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

  const filteredUsers = users.filter((user: User) => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSubscriptionStatusClass = (status?: string) => {
    if (!status) return 'status-unknown';
    
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
        return 'status-active';
      case 'trial':
        return 'status-trial';
      case 'expired':
        return 'status-expired';
      default:
        return 'status-unknown';
    }
  };

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsProfileModalOpen(false);
  };

  return (
    <div className="admin-users-container">
      <div className="admin-header">
        <h1>Users Management</h1>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading users...</div>
      ) : error ? (
        <div className="error-state">Error loading users. Please try again.</div>
      ) : (
        <>
          <div className="users-stats">
            <div className="stat-box">
              <h3>Total Users</h3>
              <p>{users.length}</p>
            </div>
            <div className="stat-box">
              <h3>Active Subscriptions</h3>
              <p>{users.filter((user: User) => 
                user.subscriptionStatus?.toLowerCase() === 'active' || 
                user.subscriptionStatus?.toLowerCase() === 'paid').length}
              </p>
            </div>
            <div className="stat-box">
              <h3>Trial Users</h3>
              <p>{users.filter((user: User) => 
                user.subscriptionStatus?.toLowerCase() === 'trial').length}
              </p>
            </div>
          </div>

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subscription</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user: User) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`subscription-status ${getSubscriptionStatusClass(user.subscriptionStatus)}`}>
                          {user.subscriptionStatus || 'Unknown'}
                        </span>
                      </td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}</td>
                      <td className="actions-cell">
                        <button 
                          className="action-btn view-btn"
                          onClick={() => handleViewUser(user.id)}
                        >
                          View
                        </button>
                        <button className="action-btn edit-btn">Edit</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="no-users-message">
                      {searchTerm ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedUserId && (
        <UserProfileModal 
          userId={selectedUserId}
          isOpen={isProfileModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default UsersList; 