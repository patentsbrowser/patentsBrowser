import { useState, useEffect } from 'react';
import axios from 'axios';
import './Admin.scss';

interface UserSubscriptionModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  currentSubscription?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UserSubscriptionModal = ({ 
  userId, 
  userName, 
  userEmail, 
  currentSubscription, 
  isOpen, 
  onClose, 
  onSuccess 
}: UserSubscriptionModalProps) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Initialize dates on open
  useEffect(() => {
    if (isOpen) {
      // Set start date to today
      const today = new Date();
      setStartDate(today.toISOString().split('T')[0]);
      
      // Set end date to 30 days from now by default
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      setEndDate(thirtyDaysLater.toISOString().split('T')[0]);
      
      // Reset states
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Sending subscription update for user:', userId);
      console.log('Request data:', { plan: 'paid', startDate, endDate, status: 'active' });
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/users/${userId}/subscription`,
        {
          plan: 'paid', // Default to 'paid' since we removed the field
          startDate,
          endDate,
          status: 'active'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('Subscription update response:', response.data);
      
      if (response.data.statusCode === 200) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to update subscription');
      }
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      
      let errorMessage = 'An error occurred while updating the subscription';
      
      if (err.response) {
        // Server responded with an error status
        errorMessage = err.response.data?.message || 
                      `Server error: ${err.response.status} ${err.response.statusText}`;
        console.error('Error response data:', err.response.data);
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection and try again.';
      } else {
        // Something happened while setting up the request
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate minimum end date (must be after start date)
  const minEndDate = startDate ? new Date(startDate) : new Date();
  minEndDate.setDate(minEndDate.getDate() + 1);
  const minEndDateString = minEndDate.toISOString().split('T')[0];

  // Additional date options
  const dateOptions = [
    { label: '1 Month', days: 30 },
    { label: '3 Months', days: 90 },
    { label: '6 Months', days: 180 },
    { label: '1 Year', days: 365 },
    { label: '2 Years', days: 730 },
  ];

  const handleDateOptionSelect = (days: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + days);
    setEndDate(end.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content subscription-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Subscription</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="user-info">
            <h3>{userName}</h3>
            <p className="email">{userEmail}</p>
            <div className="current-subscription">
              <span>Current Status:</span> 
              <span className={`status-${(currentSubscription || 'none').toLowerCase()}`}>
                {currentSubscription || 'None'}
              </span>
            </div>
          </div>
          
          {success ? (
            <div className="success-message">
              <p>✅ Subscription updated successfully!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <div className="date-input-wrapper">
                    <input 
                      type="date" 
                      id="startDate" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <i className="calendar-icon">📆</i>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="endDate">End Date</label>
                  <div className="date-input-wrapper">
                    <input 
                      type="date" 
                      id="endDate" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      min={minEndDateString}
                      required
                    />
                    <i className="calendar-icon">📆</i>
                  </div>
                </div>
              </div>
              
              <div className="date-options">
                <label className="date-options-label">Quick select duration:</label>
                <div className="date-option-buttons">
                  {dateOptions.map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      className="date-option-btn"
                      onClick={() => handleDateOptionSelect(option.days)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <div className="action-buttons">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Activate Subscription'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSubscriptionModal; 