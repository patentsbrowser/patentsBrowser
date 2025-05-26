import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FaUserPlus, FaCopy } from 'react-icons/fa';
import './OrganizationDashboard.scss';

interface OrganizationMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

const Invitation: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganizationMembers();
  }, []);

  const fetchOrganizationMembers = async () => {
    try {
      setIsLoading(true);
      const membersResponse = await fetch('http://localhost:5000/api/organization/members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const membersData = await membersResponse.json();
      if (membersData.success) {
        setMembers(membersData.data);
      } else {
        setMembers([]);
      }
    } catch (error) {
      setMembers([]);
      toast.error('Failed to load organization members');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteLink = async () => {
    try {
      setIsGeneratingLink(true);
      const response = await fetch('http://localhost:5000/api/organization/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setInviteLink(data.data.inviteLink);
        toast.success('Invite link generated successfully');
      } else {
        toast.error(data.message || 'Failed to generate invite link');
      }
    } catch (error) {
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

  return (
    <div className="organization-dashboard">
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Invitation</h1>
        <p>Generate and share invite links with new members. Manage your organization members below.</p>
      </motion.div>
      <div className="dashboard-content">
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
            {isLoading ? (
              <div className="loading">Loading organization members...</div>
            ) : members.length === 0 ? (
              <div className="no-members">No member found</div>
            ) : (
              members.map((member) => (
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
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Invitation; 