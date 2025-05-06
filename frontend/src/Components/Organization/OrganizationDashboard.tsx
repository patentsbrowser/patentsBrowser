import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import './OrganizationDashboard.scss';
import { motion } from 'framer-motion';
import { FaUsers, FaUserPlus, FaMoneyBillWave, FaCopy } from 'react-icons/fa';

interface OrganizationMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface OrganizationSubscription {
  plan: string;
  startDate: string;
  endDate: string;
  totalMembers: number;
  basePrice: number;
  memberPrice: number;
  totalPrice: number;
}

const OrganizationDashboard = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setIsLoading(true);
      // Fetch organization members
      const membersResponse = await fetch('/api/organization/members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const membersData = await membersResponse.json();
      if (membersData.success) {
        setMembers(membersData.data);
      }

      // Fetch organization subscription
      const subscriptionResponse = await fetch('/api/organization/subscription', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const subscriptionData = await subscriptionResponse.json();
      if (subscriptionData.success) {
        setSubscription(subscriptionData.data);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast.error('Failed to load organization data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteLink = async () => {
    try {
      setIsGeneratingLink(true);
      const response = await fetch('/api/organization/generate-invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setInviteLink(data.inviteLink);
        toast.success('Invite link generated successfully');
      } else {
        toast.error(data.message || 'Failed to generate invite link');
      }
    } catch (error) {
      console.error('Error generating invite link:', error);
      toast.error('Failed to generate invite link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied to clipboard');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/organization/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Member removed successfully');
        fetchOrganizationData(); // Refresh the members list
      } else {
        toast.error(data.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  if (isLoading) {
    return <div className="loading">Loading organization data...</div>;
  }

  return (
    <div className="organization-dashboard">
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Organization Dashboard</h1>
        <p>Welcome, {user?.name}</p>
      </motion.div>

      <div className="dashboard-content">
        <motion.div
          className="subscription-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2>Subscription Details</h2>
          {subscription && (
            <div className="subscription-details">
              <div className="detail-item">
                <span className="label">Plan:</span>
                <span className="value">{subscription.plan}</span>
              </div>
              <div className="detail-item">
                <span className="label">Base Price:</span>
                <span className="value">₹{subscription.basePrice}/month</span>
              </div>
              <div className="detail-item">
                <span className="label">Members:</span>
                <span className="value">{subscription.totalMembers}</span>
              </div>
              <div className="detail-item">
                <span className="label">Member Cost:</span>
                <span className="value">₹{subscription.memberPrice}/member/month</span>
              </div>
              <div className="detail-item total">
                <span className="label">Total Monthly Cost:</span>
                <span className="value">₹{subscription.totalPrice}/month</span>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          className="members-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h2>Organization Members</h2>
            <button
              className="generate-invite-btn"
              onClick={generateInviteLink}
              disabled={isGeneratingLink}
            >
              <FaUserPlus /> Generate Invite Link
            </button>
          </div>

          {inviteLink && (
            <div className="invite-link-container">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="invite-link-input"
              />
              <button
                className="copy-link-btn"
                onClick={copyInviteLink}
              >
                <FaCopy /> Copy
              </button>
            </div>
          )}

          <div className="members-list">
            {members.map((member) => (
              <motion.div
                key={member._id}
                className="member-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="member-info">
                  <h3>{member.name}</h3>
                  <p>{member.email}</p>
                  <span className="role-badge">{member.role}</span>
                </div>
                <div className="member-actions">
                  <span className="joined-date">
                    Joined: {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                  {member.role !== 'admin' && (
                    <button
                      className="remove-btn"
                      onClick={() => removeMember(member._id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrganizationDashboard; 