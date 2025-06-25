import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FaUserPlus,
  FaCopy,
  FaShare,
  FaQrcode,
  FaTimes
} from 'react-icons/fa';
import {
  EmailShareButton,
  FacebookShareButton,
  LinkedinShareButton,
  TelegramShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  EmailIcon,
  FacebookIcon,
  LinkedinIcon,
  TelegramIcon,
  TwitterIcon,
  WhatsappIcon
} from 'react-share';
import { organizationApi, OrganizationMember, InvitedMember, OrganizationData } from '../../api/organization';
import './Invitation.scss';

const Invitation: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteLink, setInviteLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    name: '',
    size: '1-10',
    type: 'startup'
  });
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');

  // Check if user has permission to access this page - Only organization admin
  const isOrganizationAdmin = user?.userType === 'organization_admin';

  // Early return after all hooks
  if (!isOrganizationAdmin) {
    return (
      <div className="organization-dashboard">
        <div className="dashboard-header">
          <h1>Access Denied</h1>
          <p>Only organization administrators can access invitation management.</p>
        </div>
      </div>
    );
  }

  // Fetch organization members
  const {
    data: membersData = [],
    isLoading: isLoadingMembers,
  } = useQuery({
    queryKey: ['organizationMembers'],
    queryFn: organizationApi.getMembers,
    enabled: isOrganizationAdmin,
    select: (data) => data.data || []
  });

  // Fetch invited members
  useQuery({
    queryKey: ['invitedMembers'],
    queryFn: organizationApi.getInvitedMembers,
    enabled: isOrganizationAdmin,
    select: (data) => data.data || []
  });

  // Generate invite link mutation
  const generateInviteLinkMutation = useMutation({
    mutationFn: organizationApi.generateInviteLink,
    onSuccess: (data) => {
      if (data.success) {
        setInviteLink(data.data.inviteLink);
        toast.success('Invite link generated successfully');
      } else {
        // If organization not found, show create organization option
        if (data.message?.includes('Organization not found')) {
          setShowCreateOrganization(true);
        }
        toast.error(data.message || 'Failed to generate invite link');
      }
    },
    onError: (error: any) => {
      toast.error('Failed to generate invite link');
    }
  });

  // Create organization mutation
  const createOrganizationMutation = useMutation({
    mutationFn: () => organizationApi.createOrganization(organizationData),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Organization created successfully');
        setShowCreateOrganization(false);
        // Refresh the page to update user context
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to create organization');
      }
    },
    onError: (error: any) => {
      toast.error('Failed to create organization');
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: organizationApi.removeMember,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Member removed successfully');
        // Invalidate and refetch members
        queryClient.invalidateQueries({ queryKey: ['organizationMembers'] });
      } else {
        toast.error(data.message || 'Failed to remove member');
      }
    },
    onError: (error: any) => {
      toast.error('Failed to remove member');
    }
  });

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied to clipboard');
    }
  };

  const generateQRCode = () => {
    setShowQRCode(true);
  };

  const shareTitle = "Join Our Organization";
  const shareText = "You're invited to join our organization! Click the link to join:";

  // Filter members based on search
  const filteredMembers = membersData.filter((member: OrganizationMember) => {
    if (!member) return false;
    
    const email = member.email || '';
    const name = member.name || '';
    const searchTerm = searchEmail.toLowerCase();
    
    return email.toLowerCase().includes(searchTerm) ||
           name.toLowerCase().includes(searchTerm);
  });

  const displayedMembers = showAllMembers ? filteredMembers : filteredMembers.slice(0, 10);

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
        <div className="dashboard-grid">
          {/* Left Column - Invite Options */}
          <motion.div
            className="invite-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="section-header">
              <h2>Organization Invitation</h2>
              <button
                className="generate-invite-btn"
                onClick={() => generateInviteLinkMutation.mutate()}
                disabled={generateInviteLinkMutation.isPending}
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
                  <EmailShareButton
                    url={inviteLink}
                    subject={shareTitle}
                    body={shareText}
                    className="quick-share-btn"
                  >
                    <EmailIcon size={45} round />
                  </EmailShareButton>

                  <WhatsappShareButton
                    url={inviteLink}
                    title={shareText}
                    className="quick-share-btn"
                  >
                    <WhatsappIcon size={45} round />
                  </WhatsappShareButton>

                  <TelegramShareButton
                    url={inviteLink}
                    title={shareText}
                    className="quick-share-btn"
                  >
                    <TelegramIcon size={45} round />
                  </TelegramShareButton>

                  <FacebookShareButton
                    url={inviteLink}
                    className="quick-share-btn"
                  >
                    <FacebookIcon size={45} round />
                  </FacebookShareButton>

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
          </motion.div>

          {/* Right Column - Members List */}
          <motion.div
            className="members-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="members-list">
            
            {isLoadingMembers ? (
              <div className="loading">Loading organization members...</div>
            ) : membersData.length === 0 ? (
              <div className="no-members">
                <div className="no-members-icon">👥</div>
                <h3>No Members Yet</h3>
                <p>Generate an invite link to add members to your organization</p>
              </div>
            ) : (
              <>
                <div className="members-header">
                  <h3>Members ({membersData.length})</h3>
                  <div className="members-stats">
                    <span className="stat">
                      <strong>{membersData.filter((m: OrganizationMember) => m.role === 'admin').length}</strong> Admin{membersData.filter((m: OrganizationMember) => m.role === 'admin').length !== 1 ? 's' : ''}
                    </span>
                    <span className="stat">
                      <strong>{membersData.filter((m: OrganizationMember) => m.role === 'member').length}</strong> Member{membersData.filter((m: OrganizationMember) => m.role === 'member').length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Search Box */}
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="search-input"
                  />
                  {searchEmail && (
                    <button
                      className="clear-search"
                      onClick={() => setSearchEmail('')}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Members List */}
                <div className="members-container">
                  {filteredMembers.length === 0 ? (
                    <div className="no-search-results">
                      <p>No members found matching "{searchEmail}"</p>
                    </div>
                  ) : (
                    displayedMembers.map((member: OrganizationMember, index: number) => (
                      <motion.div
                        key={member._id}
                        className="member-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="member-serial">
                          #{(showAllMembers ? filteredMembers.indexOf(member) : index) + 1}
                        </div>
                        <div className="member-info">
                          <div className="member-avatar">
                            {(member.name || member.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="member-details">
                            <h3>{member.name || member.email || 'Unknown User'}</h3>
                            <p className="member-email">{member.email || 'No email'}</p>
                            <div className="member-badges">
                              <span className={`role-badge ${member.role || 'member'}`}>
                                {(member.role || 'member').toUpperCase()}
                              </span>
                              <span className="status-badge active">Active</span>
                            </div>
                          </div>
                        </div>
                        <div className="member-actions">
                          <span className="joined-date">
                            Joined: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Unknown'}
                          </span>
                          {member.role !== 'admin' && (
                            <button
                              className="remove-btn"
                              onClick={() => {
                                if (window.confirm(`Remove ${member.name || 'this member'} from organization?`)) {
                                  removeMemberMutation.mutate(member._id);
                                }
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* View All Button */}
                {filteredMembers.length > 10 && (
                  <button
                    className="view-all-btn"
                    onClick={() => setShowAllMembers((prev) => !prev)}
                  >
                    {showAllMembers ? 'Show Less' : `View All (${filteredMembers.length})`}
                  </button>
                )}

                {/* Search Results Info */}
                {searchEmail && (
                  <div className="search-info">
                    Showing {filteredMembers.length} of {membersData.length} members
                  </div>
                )}
              </>
            )}
            </div>
          </motion.div>
        </div>
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
                <div className="share-option-item">
                  <EmailShareButton
                    url={inviteLink}
                    subject={shareTitle}
                    body={shareText}
                    className="share-option-btn"
                    onClick={() => setShowShareModal(false)}
                  >
                    <EmailIcon size={40} round />
                    <span>Email</span>
                  </EmailShareButton>
                </div>

                <div className="share-option-item">
                  <WhatsappShareButton
                    url={inviteLink}
                    title={shareText}
                    className="share-option-btn"
                    onClick={() => setShowShareModal(false)}
                  >
                    <WhatsappIcon size={40} round />
                    <span>WhatsApp</span>
                  </WhatsappShareButton>
                </div>

                <div className="share-option-item">
                  <TelegramShareButton
                    url={inviteLink}
                    title={shareText}
                    className="share-option-btn"
                    onClick={() => setShowShareModal(false)}
                  >
                    <TelegramIcon size={40} round />
                    <span>Telegram</span>
                  </TelegramShareButton>
                </div>

                <div className="share-option-item">
                  <FacebookShareButton
                    url={inviteLink}
                    className="share-option-btn"
                    onClick={() => setShowShareModal(false)}
                  >
                    <FacebookIcon size={40} round />
                    <span>Facebook</span>
                  </FacebookShareButton>
                </div>

                <div className="share-option-item">
                  <TwitterShareButton
                    url={inviteLink}
                    title={shareText}
                    className="share-option-btn"
                    onClick={() => setShowShareModal(false)}
                  >
                    <TwitterIcon size={40} round />
                    <span>Twitter</span>
                  </TwitterShareButton>
                </div>

                <div className="share-option-item">
                  <LinkedinShareButton
                    url={inviteLink}
                    title={shareTitle}
                    summary={shareText}
                    className="share-option-btn"
                    onClick={() => setShowShareModal(false)}
                  >
                    <LinkedinIcon size={40} round />
                    <span>LinkedIn</span>
                  </LinkedinShareButton>
                </div>
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

      {/* Create Organization Modal */}
      {showCreateOrganization && (
        <div className="modal-overlay" onClick={() => setShowCreateOrganization(false)}>
          <motion.div
            className="create-org-modal"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Create Organization</h3>
              <button
                className="close-btn"
                onClick={() => setShowCreateOrganization(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <p className="create-org-description">
                You need to create an organization first to generate invite links and manage members.
              </p>

              <div className="form-group">
                <label>Organization Name</label>
                <input
                  type="text"
                  value={organizationData.name}
                  onChange={(e) => setOrganizationData({...organizationData, name: e.target.value})}
                  placeholder="Enter organization name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Organization Size</label>
                <select
                  value={organizationData.size}
                  onChange={(e) => setOrganizationData({...organizationData, size: e.target.value})}
                  className="form-select"
                >
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501+">501+ employees</option>
                </select>
              </div>

              <div className="form-group">
                <label>Organization Type</label>
                <select
                  value={organizationData.type}
                  onChange={(e) => setOrganizationData({...organizationData, type: e.target.value})}
                  className="form-select"
                >
                  <option value="startup">Startup</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="government">Government</option>
                  <option value="educational">Educational</option>
                  <option value="research">Research</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowCreateOrganization(false)}
                >
                  Cancel
                </button>
                <button
                  className="create-btn"
                  onClick={() => createOrganizationMutation.mutate()}
                  disabled={!organizationData.name.trim() || createOrganizationMutation.isPending}
                >
                  Create Organization
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