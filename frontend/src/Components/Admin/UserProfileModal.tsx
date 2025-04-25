import { useEffect, useState } from 'react';
import axios from 'axios';
import './Admin.scss';

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Subscription {
  plan?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  amount?: number;
  _id?: string;
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
  timeSpent?: number; // Total time spent in minutes
  loginCount?: number; // Total number of logins
  avgSessionDuration?: number; // Average session time in minutes
  lastSessionDuration?: number; // Last session duration in minutes
  trialDaysRemaining?: number;
  subscription?: {
    isActive: boolean;
    mainPlan: Subscription;
    additionalPlans: Subscription[];
    isCustomPlan: boolean;
    totalDays: number;
    totalAmount: number;
    latestEndDate: string;
    stackedPlansCount: number;
    trialDaysRemaining: number;
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
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.statusCode === 200) {
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

  // Format time spent (minutes) to a human-readable format
  const formatTimeSpent = (minutes?: number): string => {
    if (!minutes) return 'N/A';
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) { // less than 24 hours
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}`;
    } else { // days
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return `${days} day${days !== 1 ? 's' : ''} ${remainingHours > 0 ? `${remainingHours} hour${remainingHours !== 1 ? 's' : ''}` : ''}`;
    }
  };

  // Format date to a readable string
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount?: number): string => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Debug current state
  console.error('Current state - isLoading:', isLoading);
  console.error('Current state - error:', error);
  console.error('Current state - userProfile:', userProfile);

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
                      {userProfile.createdAt ? formatDate(userProfile.createdAt) : 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Last Login:</span>
                    <span className="detail-value">
                      {userProfile.lastLogin ? formatDate(userProfile.lastLogin) : 'Never'}
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
                
                {/* Platform Usage Statistics */}
                <div className="detail-group">
                  <h4>Platform Usage</h4>
                  <div className="detail-row">
                    <span className="detail-label">Total Time Spent:</span>
                    <span className="detail-value">{formatTimeSpent(userProfile.timeSpent)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Login Count:</span>
                    <span className="detail-value">{userProfile.loginCount || 0}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Avg. Session:</span>
                    <span className="detail-value">
                      {userProfile.avgSessionDuration
                        ? `${Math.round(userProfile.avgSessionDuration)} minutes`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Last Session:</span>
                    <span className="detail-value">
                      {userProfile.lastSessionDuration
                        ? `${Math.round(userProfile.lastSessionDuration)} minutes`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Subscription Details */}
                <div className="detail-group">
                  <h4>Subscription Details</h4>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{userProfile.subscriptionStatus || 'None'}</span>
                  </div>
                  
                  {userProfile.subscription && (
                    <>
                      {/* Trial Information */}
                      {userProfile.subscription.trialDaysRemaining > 0 && (
                        <div className="detail-row">
                          <span className="detail-label">Trial Days Left:</span>
                          <span className="detail-value highlight">
                            {userProfile.subscription.trialDaysRemaining} days
                          </span>
                        </div>
                      )}
                      
                      {/* Main Plan Details */}
                      <div className="detail-row">
                        <span className="detail-label">Main Plan:</span>
                        <span className="detail-value">{userProfile.subscription.mainPlan?.plan || 'None'}</span>
                      </div>
                      
                      {/* Total Subscription Information */}
                      <div className="detail-row">
                        <span className="detail-label">Total Duration:</span>
                        <span className="detail-value highlight">
                          {userProfile.subscription.totalDays} days
                        </span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="detail-label">Total Amount:</span>
                        <span className="detail-value highlight">
                          {formatCurrency(userProfile.subscription.totalAmount)}
                        </span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="detail-label">Subscription Until:</span>
                        <span className="detail-value highlight">
                          {formatDate(userProfile.subscription.latestEndDate)}
                        </span>
                      </div>
                      
                      {/* Stacked Plans Information */}
                      {userProfile.subscription.isCustomPlan && (
                        <>
                          <div className="detail-row">
                            <span className="detail-label">Stacked Plans:</span>
                            <span className="detail-value highlight">
                              {userProfile.subscription.stackedPlansCount} additional plan(s)
                            </span>
                          </div>
                          
                          {userProfile.subscription.additionalPlans.length > 0 && (
                            <div className="stacked-plans-section">
                              <h5>Additional Plans</h5>
                              {userProfile.subscription.additionalPlans.map((plan, index) => (
                                <div key={plan._id || index} className="stacked-plan">
                                  <div className="detail-row">
                                    <span className="detail-label">Plan Type:</span>
                                    <span className="detail-value">{plan.plan}</span>
                                  </div>
                                  <div className="detail-row">
                                    <span className="detail-label">Duration:</span>
                                    <span className="detail-value">
                                      {formatDate(plan.startDate)} to {formatDate(plan.endDate)}
                                    </span>
                                  </div>
                                  <div className="detail-row">
                                    <span className="detail-label">Amount:</span>
                                    <span className="detail-value">{formatCurrency(plan.amount)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
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