import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import './Admin.scss';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  referenceNumber: string;
  amount: number;
  planName: string;
  status: 'verified' | 'unverified' | 'rejected';
  screenshotUrl?: string;
  createdAt: string;
  verifiedAt?: string;
  notes?: string;
  orderDetails?: {
    orderId: string;
    planId: string;
  }
}

// Payment details modal component - Read-only view
const PaymentDetailsModal = ({ payment, onClose }: {
  payment: Payment | null;
  onClose: () => void;
}) => {
  if (!payment) return null;
  
  const paymentDate = new Date(payment.createdAt);
  const formattedDate = format(paymentDate, 'MMM dd, yyyy - hh:mm a');
  
  return (
    <div className="payment-details-modal-backdrop">
      <div className="payment-details-modal">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Payment Details</h2>
        
        <div className="payment-info-grid">
          <div className="info-row">
            <div className="info-label">User:</div>
            <div className="info-value">{payment.userName} ({payment.userEmail})</div>
          </div>
          
          <div className="info-row">
            <div className="info-label">Reference Number:</div>
            <div className="info-value highlight">{payment.referenceNumber}</div>
          </div>
          
          <div className="info-row">
            <div className="info-label">Amount:</div>
            <div className="info-value">₹{payment.amount}</div>
          </div>
          
          <div className="info-row">
            <div className="info-label">Plan:</div>
            <div className="info-value">{payment.planName || 'N/A'}</div>
          </div>
          
          <div className="info-row">
            <div className="info-label">Order ID:</div>
            <div className="info-value">{payment.orderDetails?.orderId || 'N/A'}</div>
          </div>
          
          <div className="info-row">
            <div className="info-label">Date:</div>
            <div className="info-value">{formattedDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Verification modal component
const VerificationModal = ({ payment, onClose, onVerify }: {
  payment: Payment | null;
  onClose: () => void;
  onVerify: (id: string, note: string) => void;
}) => {
  const [note, setNote] = useState('');
  
  if (!payment) return null;
  
  const handleVerify = () => {
    onVerify(payment.id, note);
    onClose();
  };
  
  return (
    <div className="payment-details-modal-backdrop">
      <div className="payment-details-modal verification-modal">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Verify Payment</h2>
        
        <div className="verification-info-banner">
          <p><strong>Important:</strong> The user currently has free trial access. Verifying this payment will activate their paid subscription, changing their status from 'trial' to 'active'.</p>
        </div>
        
        <div className="user-payment-info">
          <p><strong>User:</strong> {payment.userName} ({payment.userEmail})</p>
          <p><strong>Reference Number:</strong> {payment.referenceNumber}</p>
          <p><strong>Amount:</strong> ₹{payment.amount}</p>
          <p><strong>Plan:</strong> {payment.planName || 'N/A'}</p>
        </div>
        
        <div className="verification-actions">
          <div className="notes-field">
            <label>Admin Notes (Optional):</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add verification notes..."
            ></textarea>
          </div>
          
          <div className="action-buttons">
            <button 
              className="verify-button" 
              onClick={handleVerify}
            >
              Verify & Activate Subscription
            </button>
            <button 
              className="cancel-button" 
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rejection modal component
const RejectionModal = ({ payment, onClose, onReject }: {
  payment: Payment | null;
  onClose: () => void;
  onReject: (id: string, note: string) => void;
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  
  if (!payment) return null;
  
  const handleReject = () => {
    if (!note.trim()) {
      setError('Please provide a reason for rejecting this payment');
      return;
    }
    
    onReject(payment.id, note);
    onClose();
  };
  
  return (
    <div className="payment-details-modal-backdrop">
      <div className="payment-details-modal rejection-modal">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Reject Payment</h2>
        
        <div className="rejection-warning-banner">
          <p><strong>Warning:</strong> Rejecting this payment will deny the user's subscription request. The user will remain on free tier.</p>
        </div>
        
        <div className="user-payment-info">
          <p><strong>User:</strong> {payment.userName} ({payment.userEmail})</p>
          <p><strong>Reference Number:</strong> {payment.referenceNumber}</p>
          <p><strong>Amount:</strong> ₹{payment.amount}</p>
          <p><strong>Plan:</strong> {payment.planName || 'N/A'}</p>
        </div>
        
        <div className="rejection-actions">
          <div className="notes-field">
            <label>Rejection Reason (Required):</label>
            <textarea 
              value={note} 
              onChange={(e) => {
                setNote(e.target.value);
                setError('');
              }}
              placeholder="Provide reason for rejection (will be shown to user)"
              className={error ? 'error' : ''}
            ></textarea>
            {error && <div className="error-message">{error}</div>}
          </div>
          
          <div className="action-buttons">
            <button 
              className="reject-button" 
              onClick={handleReject}
            >
              Reject Payment
            </button>
            <button 
              className="cancel-button" 
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SubscriptionsManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Fetch pending payments data
  const { data: payments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pendingPayments'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/subscriptions/pending-payments`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return response.data.data.payments || [];
      } catch (error) {
        console.error('Error fetching pending payments:', error);
        return [];
      }
    }
  });

  // Status update mutation with notes
  const updatePaymentStatus = useMutation({
    mutationFn: async ({ 
      paymentId, 
      status, 
      notes 
    }: { 
      paymentId: string; 
      status: 'verified' | 'rejected'; 
      notes?: string;
    }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/subscriptions/payment-verification/${paymentId}`,
        { status, notes },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch payments data
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
      toast.success(data.message || 'Payment status updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating payment status:', error);
      toast.error(error.response?.data?.message || 'Failed to update payment status');
    }
  });

  // Handle payment verification
  const handleVerifyPayment = (paymentId: string, notes: string = '') => {
    updatePaymentStatus.mutate({ paymentId, status: 'verified', notes });
  };

  // Handle payment rejection
  const handleRejectPayment = (paymentId: string, notes: string = '') => {
    updatePaymentStatus.mutate({ paymentId, status: 'rejected', notes });
  };

  // View payment details
  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
  };

  // Open verification modal
  const handleOpenVerificationModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowVerificationModal(true);
  };

  // Open rejection modal
  const handleOpenRejectionModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowRejectionModal(true);
  };

  // Close all modals
  const handleCloseModals = () => {
    setSelectedPayment(null);
    setShowVerificationModal(false);
    setShowRejectionModal(false);
  };

  // Filter payments based on search term
  const filteredPayments = useMemo(() => {
    return payments && payments.length ? payments.filter((payment: Payment) => {
      const matchesSearch = 
        payment.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    }) : [];
  }, [payments, searchTerm]);

  return (
    <div className="admin-subscriptions-container">
      <div className="admin-header">
        <h1>Payment Verifications</h1>
        <div className="admin-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, email or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="payments-section">
        <h2>
          <span className="payment-icon">💰</span> 
          Pending Verifications
          {filteredPayments.length > 0 && (
            <span className="pending-count">{filteredPayments.length}</span>
          )}
        </h2>
        
        {isLoading ? (
          <div className="loading-state">Loading payments...</div>
        ) : error ? (
          <div className="error-state">Error loading payments. Please try again.</div>
        ) : filteredPayments.length === 0 ? (
          <div className="no-data-state">
            <div className="no-data-message">
              <span className="no-data-icon">📋</span>
              <h3>No pending payments</h3>
              <p>There are no payment records that require verification at this time.</p>
            </div>
          </div>
        ) : (
          <div className="payments-table-container">
            <div className="pending-verification-banner">
              <div className="banner-icon">⚠️</div>
              <div className="banner-content">
                <h3>Pending Verifications</h3>
                <p>You have {filteredPayments.length} payment(s) pending verification. Users are on free trial until you verify their payments.</p>
              </div>
            </div>
            
            <table className="payments-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Plan</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment: Payment) => (
                  <tr key={payment.id}>
                    <td className="user-cell">
                      <div className="user-name">{payment.userName}</div>
                      <div className="user-email">{payment.userEmail}</div>
                    </td>
                    <td className="reference-cell">{payment.referenceNumber}</td>
                    <td className="amount-cell">₹{payment.amount}</td>
                    <td className="plan-cell">{payment.planName || 'N/A'}</td>
                    <td className="date-cell">
                      {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="view-details-btn"
                        onClick={() => handleViewDetails(payment)}
                      >
                        View Details
                      </button>
                      
                      <div className="quick-actions">
                        <button 
                          className="verify-btn" 
                          onClick={() => handleOpenVerificationModal(payment)}
                          title="Verify Payment"
                        >
                          ✓
                        </button>
                        <button 
                          className="reject-btn" 
                          onClick={() => handleOpenRejectionModal(payment)}
                          title="Reject Payment"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* View-only details modal */}
      {selectedPayment && !showVerificationModal && !showRejectionModal && (
        <PaymentDetailsModal 
          payment={selectedPayment}
          onClose={handleCloseModals}
        />
      )}

      {/* Verification modal */}
      {selectedPayment && showVerificationModal && (
        <VerificationModal 
          payment={selectedPayment}
          onClose={handleCloseModals}
          onVerify={handleVerifyPayment}
        />
      )}

      {/* Rejection modal */}
      {selectedPayment && showRejectionModal && (
        <RejectionModal 
          payment={selectedPayment}
          onClose={handleCloseModals}
          onReject={handleRejectPayment}
        />
      )}
    </div>
  );
};

export default SubscriptionsManagement;