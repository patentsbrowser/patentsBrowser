import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import './JoinOrganization.scss';

interface OrganizationDetails {
  name: string;
  size: string;
  type: string;
  adminName: string;
}

const JoinOrganization: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [organizationDetails, setOrganizationDetails] = useState<OrganizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateInvite = async () => {
      if (!token) {
        setError('Invalid invite link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/organization/validate-invite/${token}`);
        const data = await response.json();

        if (data.success) {
          setOrganizationDetails(data.data);
        } else {
          setError(data.message || 'Invalid or expired invite link');
        }
      } catch (error) {
        console.error('Error validating invite:', error);
        setError('Failed to validate invite link');
      } finally {
        setIsLoading(false);
      }
    };

    validateInvite();
  }, [token]);

  const handleJoinOrganization = async () => {
    if (!token || !user) {
      navigate(`/organization-signup/${token}`);
      return;
    }

    try {
      setIsJoining(true);
      const response = await fetch(`http://localhost:5000/api/organization/join/${token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      if (data.success) {
        const updatedUser = {
          ...user,
          isOrganization: true,
          organizationName: data.data.name,
          organizationSize: data.data.size,
          organizationType: data.data.type,
          organizationId: data.data._id,
          organizationRole: 'member' as const,
          userType: 'organization_member' as const
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        toast.success('Successfully joined organization!');
        navigate('/organization/dashboard');
      } else {
        toast.error(data.message || 'Failed to join organization');
      }
    } catch (error) {
      console.error('Error joining organization:', error);
      toast.error('Failed to join organization');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSignup = () => {
    navigate(`/organization-signup/${token}`);
  };

  if (isLoading) {
    return (
      <div className="join-organization loading">
        <div className="spinner"></div>
        <p>Validating invite link...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="join-organization error">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="error-container"
        >
          <h2>Invalid Invite Link</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="home-btn">
            Return to Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (!organizationDetails) {
    return null;
  }

  return (
    <div className="join-organization">
      <motion.div
        className="join-container"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Join Organization</h1>
        
        <div className="organization-details">
          <h2>{organizationDetails.name}</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Organization Type:</span>
              <span className="value">{organizationDetails.type}</span>
            </div>
            <div className="detail-item">
              <span className="label">Organization Size:</span>
              <span className="value">{organizationDetails.size}</span>
            </div>
            <div className="detail-item">
              <span className="label">Admin:</span>
              <span className="value">{organizationDetails.adminName}</span>
            </div>
          </div>
        </div>

        {user ? (
          <div className="join-actions">
            <button
              className="join-btn"
              onClick={handleJoinOrganization}
              disabled={isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Organization'}
            </button>
            <button
              className="cancel-btn"
              onClick={() => navigate('/')}
              disabled={isJoining}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="auth-actions">
            <div className="auth-message">
              <p>You need to create an account or log in to join this organization.</p>
            </div>
            <div className="auth-buttons">
              <button
                className="signup-btn"
                onClick={handleSignup}
              >
                Create Account & Join
              </button>
              <button
                className="login-btn"
                onClick={() => navigate('/login', { state: { returnUrl: `/join-organization/${token}` } })}
              >
                Login & Join
              </button>
            </div>
          </div>
        )}

        <div className="join-info">
          <h3>What happens when you join?</h3>
          <ul>
            <li>You'll get access to the organization's patent search workspace</li>
            <li>You can collaborate with other team members</li>
            <li>Your searches and saved patents will be shared with the team</li>
            <li>You'll be able to use the organization's subscription plan</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinOrganization; 