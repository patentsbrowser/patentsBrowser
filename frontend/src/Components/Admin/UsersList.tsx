import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './Admin.scss';
import UserProfileModal from './UserProfileModal';
import UserSubscriptionModal from './UserSubscriptionModal';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus?: string;
  createdAt?: string;
  lastLogin?: string;
}

// Default pagination options
const PAGINATION_OPTIONS = [10, 25, 50, 100];

// Subscription filter options
const SUBSCRIPTION_FILTERS = [
  { value: 'all', label: 'All Subscriptions' },
  { value: 'active', label: 'Active/Paid' },
  { value: 'trial', label: 'Free Trial' },
  { value: 'expired', label: 'Expired' },
];

const UsersList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    // Try to get the default pagination limit from settings
    const savedLimit = localStorage.getItem('adminDefaultPaginationLimit');
    return savedLimit ? Number(savedLimit) : 10; // Default to 10 if not set
  });
  
  // Listen for settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.defaultPaginationLimit) {
        setItemsPerPage(event.detail.defaultPaginationLimit);
        setCurrentPage(1); // Reset to first page
      }
    };
    
    // Add event listener
    window.addEventListener('adminSettingsUpdated', handleSettingsUpdate as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('adminSettingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);
  
  const { data: users = [], isLoading, error, refetch } = useQuery({
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

  const filteredUsers = users.filter((user: User) => {
    // Filter by search term
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by subscription status
    let matchesSubscription = true;
    if (subscriptionFilter !== 'all') {
      const status = user.subscriptionStatus?.toLowerCase() || '';
      
      if (subscriptionFilter === 'active') {
        matchesSubscription = status === 'active' || status === 'paid';
      } else if (subscriptionFilter === 'trial') {
        matchesSubscription = status === 'trial';
      } else if (subscriptionFilter === 'expired') {
        matchesSubscription = status === 'expired';
      }
    }
    
    return matchesSearch && matchesSubscription;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to first page when search term, subscription filter, or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, subscriptionFilter, itemsPerPage]);

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

  const handleEditSubscription = (user: User) => {
    setSelectedUser(user);
    setSelectedUserId(user.id);
    setIsSubscriptionModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const handleCloseSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
  };

  const handleSubscriptionSuccess = () => {
    // Refetch the users data to update the UI with new subscription status
    refetch();
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <div className="admin-users-container">
      <div className="admin-header">
        <h1>Users Management</h1>
        <div className="admin-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="subscription-filter">
            <select
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value)}
            >
              {SUBSCRIPTION_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
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

          <div className="pagination-controls">
            
            <div className="pagination-info">
              Showing {Math.min(filteredUsers.length, 1 + indexOfFirstItem)}-{Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} users
            </div>
          </div>

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subscription</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length > 0 ? (
                  currentUsers.map((user: User, index: number) => (
                    <tr key={user.id}>
                      <td>{indexOfFirstItem + index + 1}</td>
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
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEditSubscription(user)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="no-users-message">
                      {searchTerm ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredUsers.length > 0 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(1)} 
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                &laquo;
              </button>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}

                disabled={currentPage === 1}
                className="pagination-btn"
              >
                &lsaquo;
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Logic to show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button 
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                &rsaquo;
              </button>
              <button 
                onClick={() => handlePageChange(totalPages)} 
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {selectedUserId && (
        <UserProfileModal 
          userId={selectedUserId}
          isOpen={isProfileModalOpen}
          onClose={handleCloseProfileModal}
        />
      )}

      {selectedUser && (
        <UserSubscriptionModal 
          userId={selectedUser.id}
          userName={selectedUser.name}
          userEmail={selectedUser.email}
          currentSubscription={selectedUser.subscriptionStatus}
          isOpen={isSubscriptionModalOpen}
          onClose={handleCloseSubscriptionModal}
          onSuccess={handleSubscriptionSuccess}
        />
      )}
    </div>
  );
};

export default UsersList; 