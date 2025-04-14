import { useEffect, useState } from 'react';
import axios from 'axios';
import './Admin.scss';

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  number?: string;
  phoneCode?: string;
  imageUrl?: string;
  subscriptionStatus?: string;
  createdAt?: string;
  lastLogin?: string;
  address?: string;
  gender?: string;
  nationality?: string;
  isAdmin?: boolean;
  isEmailVerified?: boolean;
  subscription?: {
    plan?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  };
}

const UserProfileModal = ({ userId, isOpen, onClose }: UserProfileModalProps) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching user profile for ID:', userId);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('API Response:', response.data);
      
      if (response.data.statusCode === 200) {
        console.log('User data from API:', response.data.data);
        setUserProfile(response.data.data);
      } else {
        console.error('API Error:', response.data.message);
        setError(response.data.message || 'Failed to load user profile');
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setError(err.message || 'An error occurred while fetching the user profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Debug current state
  console.log('Current state - isLoading:', isLoading);
  console.log('Current state - error:', error);
  console.log('Current state - userProfile:', userProfile);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>User Profile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {isLoading ? (
            <div className="loading-state">Loading user profile...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : userProfile ? (
            <div className="user-profile-details">
              <div className="profile-header">
                <div className="profile-image-container">
                  {userProfile.imageUrl ? (
                    <img 
                      src={`${import.meta.env.VITE_API_URL}${userProfile.imageUrl}`} 
                      alt={`${userProfile.name}'s profile`} 
                      className="profile-image"
                    />
                  ) : (
                    <div className="profile-image-placeholder">
                      <span>{userProfile.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="profile-title">
                  <h3>{userProfile.name}</h3>
                  <p className="email">{userProfile.email}</p>
                  {userProfile.subscriptionStatus && (
                    <span className={`subscription-status status-${userProfile.subscriptionStatus.toLowerCase()}`}>
                      {userProfile.subscriptionStatus}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="profile-details">
                <div className="detail-group">
                  <h4>Contact Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{userProfile.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">
                      {userProfile.phoneCode && userProfile.number 
                        ? `${userProfile.phoneCode} ${userProfile.number}` 
                        : 'Not provided'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{userProfile.address || 'Not provided'}</span>
                  </div>
                  {userProfile.nationality && (
                    <div className="detail-row">
                      <span className="detail-label">Nationality:</span>
                      <span className="detail-value">{userProfile.nationality}</span>
                    </div>
                  )}
                  {userProfile.gender && (
                    <div className="detail-row">
                      <span className="detail-label">Gender:</span>
                      <span className="detail-value">{userProfile.gender}</span>
                    </div>
                  )}
                </div>
                
                <div className="detail-group">
                  <h4>Account Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Member Since:</span>
                    <span className="detail-value">
                      {userProfile.createdAt 
                        ? new Date(userProfile.createdAt).toLocaleDateString() 
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Last Login:</span>
                    <span className="detail-value">
                      {userProfile.lastLogin 
                        ? new Date(userProfile.lastLogin).toLocaleDateString() 
                        : 'Never'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email Verified:</span>
                    <span className="detail-value">
                      {userProfile.isEmailVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Admin Status:</span>
                    <span className="detail-value">
                      {userProfile.isAdmin ? 'Administrator' : 'Regular User'}
                    </span>
                  </div>
                </div>
                
                <div className="detail-group">
                  <h4>Subscription Details</h4>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{userProfile.subscriptionStatus || 'None'}</span>
                  </div>
                  {userProfile.subscription && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Plan:</span>
                        <span className="detail-value">{userProfile.subscription.plan || 'None'}</span>
                      </div>
                      {userProfile.subscription.startDate && (
                        <div className="detail-row">
                          <span className="detail-label">Started:</span>
                          <span className="detail-value">
                            {new Date(userProfile.subscription.startDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {userProfile.subscription.endDate && (
                        <div className="detail-row">
                          <span className="detail-label">Expires:</span>
                          <span className="detail-value">
                            {new Date(userProfile.subscription.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="error-state">No user data found</div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal; 