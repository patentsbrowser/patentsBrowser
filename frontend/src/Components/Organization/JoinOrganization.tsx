import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import axiosInstance from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import './JoinOrganization.scss';

const JoinOrganization: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      return;
    }

    // If user is not authenticated, redirect to login with return URL
    if (!isAuthenticated) {
      navigate(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Fetch organization info for the invite token
    fetchOrganizationInfo();
  }, [token, isAuthenticated, navigate]);

  const fetchOrganizationInfo = async () => {
    try {
      setLoading(true);
      // You might want to create an endpoint to get organization info by token
      // For now, we'll proceed directly to join
    } catch (error) {
      console.error('Error fetching organization info:', error);
      setError('Failed to load organization information');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axiosInstance.post(`/organizations/join/${token}`);
      
      if (response.data.success) {
        toast.success('Successfully joined organization!');
        // Update user context or refresh user data
        navigate('/auth/dashboard');
      } else {
        toast.error(response.data.message || 'Failed to join organization');
      }
    } catch (error: any) {
      console.error('Error joining organization:', error);
      const errorMessage = error.response?.data?.message || 'Failed to join organization';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="join-organization-page">
        <div className="join-container">
          <h1>Join Organization</h1>
          <p>Please log in to join the organization.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="join-organization-page">
        <div className="join-container error">
          <h1>Error</h1>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-organization-page">
      <div className="join-container">
        <h1>Join Organization</h1>
        <div className="invitation-card">
          <div className="invitation-header">
            <h2>Organization Invitation</h2>
            <p>You have been invited to join an organization.</p>
          </div>
          
          <div className="user-info">
            <p><strong>Joining as:</strong> {user?.name} ({user?.email})</p>
          </div>

          <div className="invitation-actions">
            <button 
              onClick={handleJoinOrganization}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Joining...' : 'Accept Invitation'}
            </button>
            <button 
              onClick={() => navigate('/')}
              className="btn btn-secondary"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;
