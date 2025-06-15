import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  FaUserPlus,
  FaCopy,
  FaEnvelope,
  FaWhatsapp,
  FaTelegram,
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaShare,
  FaLink,
  FaQrcode,
  FaTimes
} from 'react-icons/fa';
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Check if user has permission to access this page
  const hasOrganizationAccess = user?.isOrganization ||
                                user?.userType === 'organization_admin' ||
                                user?.organizationId ||
                                user?.organizationRole;

  if (!hasOrganizationAccess) {
    return (
      <div className="organization-dashboard">
        <div className="dashboard-header">
          <h1>Access Denied</h1>
          <p>You need to be part of an organization to access this page.</p>
        </div>
      </div>
    );
  }

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

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join Our Organization');
    const body = encodeURIComponent(`You're invited to join our organization! Click the link below to join:\n\n${inviteLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Join our organization! ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaTelegram = () => {
    const text = encodeURIComponent(`Join our organization! ${inviteLink}`);
    window.open(`https://t.me/share/url?url=${inviteLink}&text=${text}`, '_blank');
  };

  const shareViaInstagram = () => {
    // Instagram doesn't support direct link sharing, so we copy to clipboard
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link copied! You can now paste it in Instagram');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent('Join our organization!');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(inviteLink)}`, '_blank');
  };

  const shareViaLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteLink)}`, '_blank');
  };

  const generateQRCode = () => {
    setShowQRCode(true);
  };

  const shareOptions = [
    { name: 'Email', icon: FaEnvelope, action: shareViaEmail, color: '#EA4335' },
    { name: 'WhatsApp', icon: FaWhatsapp, action: shareViaWhatsApp, color: '#25D366' },
    { name: 'Telegram', icon: FaTelegram, action: shareViaTelegram, color: '#0088CC' },
    { name: 'Facebook', icon: FaFacebook, action: shareViaFacebook, color: '#1877F2' },
    { name: 'Twitter', icon: FaTwitter, action: shareViaTwitter, color: '#1DA1F2' },
    { name: 'LinkedIn', icon: FaLinkedin, action: shareViaLinkedIn, color: '#0A66C2' },
    { name: 'Instagram', icon: FaInstagram, action: shareViaInstagram, color: '#E4405F' },
  ];

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
              <div className="invite-link-section">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="invite-link-input"
                />
                <div className="link-actions">
                  <button
                    className="copy-btn"
                    onClick={copyInviteLink}
                    title="Copy link"
                  >
                    <FaCopy />
                  </button>
                  <button
                    className="share-btn"
                    onClick={() => setShowShareModal(true)}
                    title="Share link"
                  >
                    <FaShare />
                  </button>
                  <button
                    className="qr-btn"
                    onClick={generateQRCode}
                    title="Generate QR Code"
                  >
                    <FaQrcode />
                  </button>
                </div>
              </div>

              <div className="quick-share-options">
                <span className="quick-share-label">Quick Share:</span>
                <div className="quick-share-buttons">
                  {shareOptions.slice(0, 4).map((option) => (
                    <button
                      key={option.name}
                      className="quick-share-btn"
                      onClick={option.action}
                      title={`Share via ${option.name}`}
                      style={{ backgroundColor: option.color }}
                    >
                      <option.icon />
                    </button>
                  ))}
                  <button
                    className="more-options-btn"
                    onClick={() => setShowShareModal(true)}
                    title="More sharing options"
                  >
                    <FaShare /> More
                  </button>
                </div>
              </div>
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <motion.div
            className="share-modal"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Share Invitation Link</h3>
              <button
                className="close-btn"
                onClick={() => setShowShareModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <div className="share-link-display">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="modal-link-input"
                />
                <button
                  className="modal-copy-btn"
                  onClick={copyInviteLink}
                >
                  <FaCopy /> Copy
                </button>
              </div>

              <div className="share-options-grid">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    className="share-option-btn"
                    onClick={() => {
                      option.action();
                      setShowShareModal(false);
                    }}
                    style={{ borderColor: option.color }}
                  >
                    <option.icon style={{ color: option.color }} />
                    <span>{option.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="modal-overlay" onClick={() => setShowQRCode(false)}>
          <motion.div
            className="qr-modal"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>QR Code for Invitation</h3>
              <button
                className="close-btn"
                onClick={() => setShowQRCode(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <div className="qr-code-container">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`}
                  alt="QR Code for invitation link"
                  className="qr-code-image"
                />
                <p className="qr-description">
                  Scan this QR code to join the organization
                </p>
                <button
                  className="download-qr-btn"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(inviteLink)}`;
                    link.download = 'organization-invite-qr.png';
                    link.click();
                  }}
                >
                  Download QR Code
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Invitation; 