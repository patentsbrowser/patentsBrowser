import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
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
import './Invitation.scss';

interface OrganizationMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  status?: 'active' | 'pending' | 'inactive';
  userType?: string;
}

interface InvitedMember {
  token: string;
  createdAt: string;
  expiresAt: string;
  inviteLink: string;
  status: 'pending';
}

interface JoinRequest {
  _id: string;
  name: string;
  email: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
}

const Invitation: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInvited, setIsLoadingInvited] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [organizationData, setOrganizationData] = useState({
    name: '',
    size: '1-10',
    type: 'startup'
  });
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');

  // Check if user has permission to access this page - Only organization admin
  const isOrganizationAdmin = user?.userType === 'organization_admin';

  // All hooks must be called before any early returns
  useEffect(() => {
    if (isOrganizationAdmin) {
      fetchOrganizationMembers();
      fetchInvitedMembers();
      fetchJoinRequests();
    }
  }, [isOrganizationAdmin]);

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

  const fetchOrganizationMembers = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching organization members...');
      const membersResponse = await fetch('http://localhost:5000/api/organization/members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const membersData = await membersResponse.json();
      console.log('📊 Members API Response:', membersData);
      
      if (membersData.success && Array.isArray(membersData.data)) {
        console.log('✅ Raw members data:', membersData.data);
        // Less strict filtering - just check for required fields
        const validMembers = membersData.data.filter((member: any) => {
          const hasId = member && member._id;
          const hasEmail = member && member.email;
          const hasName = member && member.name;
          
          console.log(`Member ${member?._id}: hasId=${hasId}, hasEmail=${hasEmail}, hasName=${hasName}`);
          
          // More lenient check - just need id and email
          return hasId && hasEmail;
        });
        console.log('✅ Valid members after filtering:', validMembers);
        setMembers(validMembers);
      } else {
        console.log('❌ API failed or data is not array:', membersData);
        setMembers([]);
        if (!membersData.success) {
          console.log('Members API response:', membersData.message);
        }
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
      toast.error('Failed to load organization members');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitedMembers = async () => {
    try {
      setIsLoadingInvited(true);
      const invitedResponse = await fetch('http://localhost:5000/api/organization/invited-members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const invitedData = await invitedResponse.json();
      if (invitedData.success) {
        setInvitedMembers(invitedData.data);
      } else {
        setInvitedMembers([]);
      }
    } catch (error) {
      setInvitedMembers([]);
      console.error('Failed to load invited members:', error);
    } finally {
      setIsLoadingInvited(false);
    }
  };

  const fetchJoinRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const response = await fetch('http://localhost:5000/api/organization/join-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setJoinRequests(data.data || []);
      } else {
        setJoinRequests([]);
      }
    } catch (error) {
      setJoinRequests([]);
      console.error('Failed to load join requests:', error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`http://localhost:5000/api/organization/join-requests/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Request ${action}d successfully`);
        fetchJoinRequests(); // Refresh the list
        if (action === 'approve') {
          fetchOrganizationMembers(); // Refresh members list
        }
      } else {
        toast.error(data.message || `Failed to ${action} request`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} request`);
    }
  };

  const createOrganization = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/organization/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(organizationData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Organization created successfully');
        setShowCreateOrganization(false);
        // Refresh the page to update user context
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to create organization');
      }
    } catch (error) {
      toast.error('Failed to create organization');
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
        // If organization not found, show create organization option
        if (data.message.includes('Organization not found')) {
          setShowCreateOrganization(true);
        }
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

  const generateQRCode = () => {
    setShowQRCode(true);
  };

  const shareTitle = "Join Our Organization";
  const shareText = "You're invited to join our organization! Click the link to join:";

  // Filter members based on search
  const filteredMembers = members.filter(member => {
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

          {/* Right Column - Join Requests & Members */}
          <motion.div
            className="requests-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="section-header">
              <h2>Join Requests</h2>
              <span className="requests-count">
                {joinRequests.filter(req => req.status === 'pending').length} pending
              </span>
            </div>

            <div className="join-requests-list">
              {isLoadingRequests ? (
                <div className="loading">Loading join requests...</div>
              ) : joinRequests.length === 0 ? (
                <div className="no-requests">
                  <div className="no-requests-icon">📝</div>
                  <h3>No Join Requests</h3>
                  <p>No one has requested to join your organization yet</p>
                </div>
              ) : (
                <div className="requests-container">
                  {joinRequests.map((request) => (
                    <motion.div
                      key={request._id}
                      className={`request-card ${request.status}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="request-info">
                        <div className="request-avatar">
                          {request.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="request-details">
                          <h3>{request.name}</h3>
                          <p className="request-email">{request.email}</p>
                          <span className="request-date">
                            Requested: {new Date(request.requestedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          {request.message && (
                            <p className="request-message">"{request.message}"</p>
                          )}
                        </div>
                      </div>
                      <div className="request-actions">
                        <span className={`status-badge ${request.status}`}>
                          {request.status.toUpperCase()}
                        </span>
                        {request.status === 'pending' && (
                          <div className="action-buttons">
                            <button
                              className="approve-btn"
                              onClick={() => handleJoinRequest(request._id, 'approve')}
                            >
                              Approve
                            </button>
                            <button
                              className="reject-btn"
                              onClick={() => handleJoinRequest(request._id, 'reject')}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="members-list">
            
            {isLoading ? (
              <div className="loading">Loading organization members...</div>
            ) : members.length === 0 ? (
              <div className="no-members">
                <div className="no-members-icon">👥</div>
                <h3>No Members Yet</h3>
                <p>Generate an invite link to add members to your organization</p>
              </div>
            ) : (
              <>
                <div className="members-header">
                  <h3>Members ({members.length})</h3>
                  <div className="members-stats">
                    <span className="stat">
                      <strong>{members.filter(m => m.role === 'admin').length}</strong> Admin{members.filter(m => m.role === 'admin').length !== 1 ? 's' : ''}
                    </span>
                    <span className="stat">
                      <strong>{members.filter(m => m.role === 'member').length}</strong> Member{members.filter(m => m.role === 'member').length !== 1 ? 's' : ''}
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
                    displayedMembers.map((member, index) => (
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
                                  // TODO: Implement remove member functionality
                                  toast('Remove member functionality coming soon');
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
                    Showing {filteredMembers.length} of {members.length} members
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
                  onClick={createOrganization}
                  disabled={!organizationData.name.trim()}
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