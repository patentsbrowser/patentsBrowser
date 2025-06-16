import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import './OrganizationSignup.scss';

interface OrganizationDetails {
  name: string;
  size: string;
  type: string;
  adminName: string;
}

const OrganizationSignup: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizationDetails, setOrganizationDetails] = useState<OrganizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!token) {
      toast.error('Invalid invite link');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('http://localhost:5000/api/auth/signup-with-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          inviteToken: token
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Signup successful! Please check your email for OTP verification.');
        // Store email for OTP verification
        localStorage.setItem('pendingVerificationEmail', formData.email);
        navigate('/verify-otp', { 
          state: { 
            email: formData.email,
            mode: 'organization-signup',
            inviteToken: token
          }
        });
      } else {
        toast.error(data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Error during signup:', error);
      toast.error('Failed to complete signup');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="organization-signup loading">
        <div className="spinner"></div>
        <p>Validating invite link...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organization-signup error">
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
    <div className="organization-signup">
      <motion.div
        className="signup-container"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Join {organizationDetails.name}</h1>
        
        <div className="organization-details">
          <h2>Organization Details</h2>
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

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Create a password"
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              placeholder="Confirm your password"
              minLength={8}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="signup-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="signup-info">
          <h3>What happens next?</h3>
          <ul>
            <li>Create your account with the organization</li>
            <li>Verify your email with OTP</li>
            <li>Get immediate access to the organization's workspace</li>
            <li>Start collaborating with team members</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default OrganizationSignup; 