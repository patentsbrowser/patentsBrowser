import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import "./Admin.scss";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Loader from "../Common/Loader";

interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: 'verified' | 'unverified' | 'rejected' | 'cancelled' | 'inactive' | 'active' | 'paid';
  referenceNumber: string;
  plan: string;
  paymentDate: string;
  verificationDate?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectionDate?: string;
  createdAt: string;
  planName: string;
  userSubscriptionStatus?: string;
  orderDetails?: {
    orderId: string;
    planId: string;
  };
}

// Payment details modal component - Read-only view
const PaymentDetailsModal = ({
  payment,
  onClose,
}: {
  payment: Payment | null;
  onClose: () => void;
}) => {
  if (!payment) return null;

  const paymentDate = new Date(payment.createdAt);
  const formattedDate = format(paymentDate, "MMM dd, yyyy - hh:mm a");

  return (
    <div className="payment-details-modal-backdrop">
      <div className="payment-details-modal">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <h2>Payment Details</h2>

        <div className="payment-info-grid">
          <div className="info-row">
            <div className="info-label">User:</div>
            <div className="info-value">
              {payment.userName} ({payment.userEmail})
            </div>
          </div>

          <div className="info-row">
            <div className="info-label">Reference Number:</div>
            <div className="info-value highlight">
              {payment.referenceNumber}
            </div>
          </div>

          <div className="info-row">
            <div className="info-label">Amount:</div>
            <div className="info-value">₹{payment.amount}</div>
          </div>

          <div className="info-row">
            <div className="info-label">Plan:</div>
            <div className="info-value">{payment.planName || "N/A"}</div>
          </div>

          <div className="info-row">
            <div className="info-label">Order ID:</div>
            <div className="info-value">
              {payment.orderDetails?.orderId || "N/A"}
            </div>
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
const VerificationModal = ({
  payment,
  onClose,
  onVerify,
}: {
  payment: Payment | null;
  onClose: () => void;
  onVerify: (id: string, note: string, subscriptionStatus?: string) => void;
}) => {
  const [note, setNote] = useState("");

  if (!payment) return null;

  // Check if user already has an active subscription based on payment object
  const hasActiveSubscription = payment.userSubscriptionStatus === 'active';

  const handleVerify = () => {
    onVerify(payment.id, note, payment.userSubscriptionStatus);
    onClose();
  };

  return (
    <div className="payment-details-modal-backdrop">
      <div className="payment-details-modal verification-modal">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <h2>Verify Payment</h2>

        <div className="verification-info-banner">
          <p>
            <strong>Important:</strong> {hasActiveSubscription 
              ? "The user already has an active subscription. Verifying this payment will add the new plan to their account."
              : "The user currently has free trial access. Verifying this payment will activate their paid subscription, changing their status from 'trial' to 'active'."
            }
          </p>
        </div>

        <div className="user-payment-info">
          <p>
            <strong>User:</strong> {payment.userName} ({payment.userEmail})
          </p>
          <p>
            <strong>Reference Number:</strong> {payment.referenceNumber}
          </p>
          <p>
            <strong>Amount:</strong> ₹{payment.amount}
          </p>
          <p>
            <strong>Plan:</strong> {payment.planName || "N/A"}
          </p>
          {hasActiveSubscription && (
            <p>
              <strong>Current Status:</strong> <span className="active-status">Active Subscription</span>
            </p>
          )}
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
            <button className="verify-button" onClick={handleVerify}>
              {hasActiveSubscription ? "Verify & Add New Plan" : "Verify & Activate Subscription"}
            </button>
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rejection modal component
const RejectionModal = ({
  payment,
  onClose,
  onReject,
}: {
  payment: Payment | null;
  onClose: () => void;
  onReject: (id: string, note: string) => void;
}) => {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!payment) return null;

  const handleReject = () => {
    if (!note.trim()) {
      setError("Please provide a reason for rejecting this payment");
      return;
    }

    onReject(payment.id, note);
    onClose();
  };

  return (
    <div className="payment-details-modal-backdrop">
      <div className="payment-details-modal rejection-modal">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <h2>Reject Payment</h2>

        <div className="rejection-warning-banner">
          <p>
            <strong>Warning:</strong> Rejecting this payment will deny the
            user's subscription request. The user will remain on free tier.
          </p>
        </div>

        <div className="user-payment-info">
          <p>
            <strong>User:</strong> {payment.userName} ({payment.userEmail})
          </p>
          <p>
            <strong>Reference Number:</strong> {payment.referenceNumber}
          </p>
          <p>
            <strong>Amount:</strong> ₹{payment.amount}
          </p>
          <p>
            <strong>Plan:</strong> {payment.planName || "N/A"}
          </p>
        </div>

        <div className="rejection-actions">
          <div className="notes-field">
            <label>Rejection Reason (Required):</label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError("");
              }}
              placeholder="Provide reason for rejection (will be shown to user)"
              className={error ? "error" : ""}
              style={{
                backgroundColor: "var(--input-bg, #f1f5f9)",
                color: "var(--text-color, #1e293b)",
                border: "1px solid var(--border-color, #cbd5e1)"
              }}
            ></textarea>
            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="action-buttons">
            <button className="reject-button" onClick={handleReject}>
              Reject Payment
            </button>
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add these new interfaces
interface ExtractedReference {
  referenceNumber: string;
  date: string;
  amount: string;
  matches: Payment[];
}

interface ReferenceMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedReferences: ExtractedReference[];
  onVerifyAll: (references: string[]) => void;
}

const SubscriptionsManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedReferences, setExtractedReferences] = useState<ExtractedReference[]>([]);
  const [isReferenceMatcherModalOpen, setIsReferenceMatcherModalOpen] = useState(false);
  const [processingResults, setProcessingResults] = useState<{success: number, failed: number}>({ success: 0, failed: 0 });

  // Filter payments based on search term and reference number
  const filteredPayments = useMemo(() => {
    return payments && payments.length
      ? payments.filter((payment: Payment) => {
          // First check if payment has a valid reference number
          if (!payment.referenceNumber || payment.referenceNumber === 'No Reference' || payment.referenceNumber.trim() === '') {
            return false;
          }

          // Then apply status filter
          if (statusFilter !== 'all' && payment.status !== statusFilter) {
            return false;
          }

          // Finally apply search filter
          const matchesSearch =
            payment.userName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            payment.userEmail
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            payment.referenceNumber
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase());

          return matchesSearch;
        })
      : [];
  }, [payments, searchTerm, statusFilter]);

  // Fetch pending payments data
  const {
    data: paymentsData = [],
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch,
  } = useQuery({
    queryKey: ["pendingPayments"],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/subscriptions/pending-payments?includeUserStatus=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        // Log the response to debug
        return response.data.data.payments || [];
      } catch (error) {
        console.error("Error fetching pending payments:", error);
        return [];
      }
    },
    // Add refetch interval to keep data fresh
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Sync the API data with our local state
  useEffect(() => {
    if (paymentsData) {
      setPayments(paymentsData);
    }
  }, [paymentsData]);

  // Update loading and error states from API
  useEffect(() => {
    setIsLoading(paymentsLoading);
    if (paymentsError) {
      console.error('Payments loading error:', paymentsError);
      setError(String(paymentsError));
    }
  }, [paymentsLoading, paymentsError]);

  // Status update mutation with notes
  const updatePaymentStatus = useMutation({
    mutationFn: async ({
      paymentId,
      status,
      notes,
      subscriptionStatus,
    }: {
      paymentId: string;
      status: 'verified' | 'rejected' | 'cancelled' | 'inactive';
      notes?: string;
      subscriptionStatus?: string;
    }) => {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/subscriptions/payment-verification/${paymentId}`,
        { status, notes, subscriptionStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch payments data
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      toast.success(data.message || "Payment status updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating payment status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update payment status"
      );
    },
  });

  // Handle payment verification
  const handleVerifyPayment = (paymentId: string, notes: string = "", subscriptionStatus?: string) => {
    updatePaymentStatus.mutate({ paymentId, status: "verified", notes, subscriptionStatus });
  };

  // Handle payment rejection
  const handleRejectPayment = (paymentId: string, notes: string = "") => {
    updatePaymentStatus.mutate({ paymentId, status: "rejected", notes });
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

  // Add this function to extract references from a bank statement
  const extractReferencesFromFile = async () => {
    if (!bankStatementFile) return;
    
    setIsProcessing(true);
    try {
      // Here you would call your backend API to process the file
      // For demonstration, I'll simulate the process
      
      const formData = new FormData();
      formData.append('file', bankStatementFile);
      
      // Make an API call to extract references
      // const response = await api.post('/admin/extract-references', formData);
      // const extractedRefs = response.data.references;
      
      // Simulating API response with mock data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate extracted references
      const mockExtractedRefs = [
        { 
          referenceNumber: 'UTR12345678', 
          date: '2023-11-15', 
          amount: '199.00',
          matches: [] as Payment[]
        },
        { 
          referenceNumber: 'REF987654321', 
          date: '2023-11-16', 
          amount: '299.00',
          matches: [] as Payment[]
        },
        { 
          referenceNumber: 'PAY2023111712', 
          date: '2023-11-17', 
          amount: '99.00',
          matches: [] as Payment[]
        }
      ];
      
      // Find matching payments for each reference
      const refsWithMatches = mockExtractedRefs.map(ref => {
        const matches = payments.filter(
          p => p.status === 'unverified' && 
          p.referenceNumber.toLowerCase() === ref.referenceNumber.toLowerCase()
        );
        return { ...ref, matches };
      });
      
      // Only keep references that have matches
      const refsWithValidMatches = refsWithMatches.filter(ref => ref.matches.length > 0);
      
      setExtractedReferences(refsWithValidMatches);
      
      if (refsWithValidMatches.length > 0) {
        setIsReferenceMatcherModalOpen(true);
      } else {
        toast.success('No matching references found in pending payments.');
      }
    } catch (err) {
      console.error('Error processing file:', err);
      toast.error('Failed to process the file. Please try again.');
    } finally {
      setIsProcessing(false);
      // Clear the file input after processing
      setBankStatementFile(null);
      // Reset the file input element
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };
  
  // Add this function to handle verification of multiple payments
  const handleVerifyMatchedPayments = async (references: string[]) => {
    setIsProcessing(true);
    try {
      let successCount = 0;
      let failedCount = 0;
      
      // Get all payments matching these references
      const paymentsToVerify = payments.filter(
        p => p.status === 'unverified' && references.includes(p.referenceNumber)
      );
      
      // Here you would call your backend API to verify these payments
      for (const payment of paymentsToVerify) {
        try {
          await updatePaymentStatus.mutateAsync({
            paymentId: payment.id,
            status: 'verified',
            notes: 'Verified via bank statement reference matching',
            subscriptionStatus: payment.userSubscriptionStatus
          });
          successCount++;
        } catch (error) {
          console.error(`Error verifying payment ${payment.id}:`, error);
          failedCount++;
        }
      }
      
      setProcessingResults({ success: successCount, failed: failedCount });
      
      toast.success(`Successfully verified ${successCount} payments.`);
      if (failedCount > 0) {
        toast.error(`Failed to verify ${failedCount} payments.`);
      }
      setIsReferenceMatcherModalOpen(false);
      
      // Refresh the payment list
      refetch();
    } catch (err) {
      console.error('Error verifying payments:', err);
      toast.error('Failed to verify payments. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="admin-subscriptions-container">
      <div className="admin-header">
        <h1>Subscription Payments Management</h1>
        <div className="admin-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, email or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="status-filter">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Payments</option>
              <option value="verified">Verified</option>
              <option value="unverified">Pending Verification</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Add the Bank Statement Upload Section */}
      <div className="utr-uploader-section">
        <h2>Reference Number Matcher</h2>
        <p>Upload a bank statement or UTR file to automatically match reference numbers with pending subscription payments.</p>
        
        <div className="utr-upload-container">
          <div className="file-input-wrapper">
            <label className="custom-file-label">
              Choose File
              <input
                type="file"
                accept=".pdf,.csv,.xlsx,.xls,.txt"
                onChange={(e) => setBankStatementFile(e.target.files?.[0] || null)}
                disabled={isProcessing}
              />
            </label>
            {bankStatementFile && (
              <>
                <span className="selected-file">{bankStatementFile.name}</span>
                <button
                  className="clear-file-btn"
                  onClick={() => {
                    setBankStatementFile(null);
                    const fileInput = document.querySelector('input[type=\"file\"]') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                  disabled={isProcessing}
                  title="Clear file"
                >
                  ×
                </button>
              </>
            )}
            <button
              className={`upload-btn${!bankStatementFile || isProcessing ? ' disabled' : ''}`}
              onClick={extractReferencesFromFile}
              disabled={!bankStatementFile || isProcessing}
            >
              Extract References
            </button>
          </div>
          
          {isProcessing && (
            <Loader fullScreen text="Processing bank statement..." />
          )}
          
          {processingResults.success > 0 && (
            <div className="extracted-utrs-container">
              <div className="process-utr-actions">
                <div className="processing-result">
                  <span className="success-count">
                    ✓ {processingResults.success} payments verified
                  </span>
                  {processingResults.failed > 0 && (
                    <span className="failed-count">
                      ✗ {processingResults.failed} failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* The rest of your component */}
      <div className="payments-section">
        <h2>Payment Records</h2>
        
        {isLoading ? (
          <div className="loading-state">Loading payment data...</div>
        ) : error ? (
          <div className="error-state">Error: {error}</div>
        ) : payments.length === 0 ? (
          <div className="no-data-state">
            <div className="no-data-message">
              <span className="no-data-icon">💸</span>
              <h3>No payment records found</h3>
              <p>There are no payment records in the system yet.</p>
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="no-data-state">
            <div className="no-data-message">
              <span className="no-data-icon">🔍</span>
              <h3>No matching records</h3>
              <p>No payments with reference numbers match your current filters. Try adjusting your search or filter criteria.</p>
            </div>
          </div>
        ) : (
          <div className="payments-table-container">
            {statusFilter === 'unverified' && filteredPayments.some(p => p.status === 'unverified') && (
              <div className="pending-verification-banner">
                <div className="banner-icon">⚠️</div>
                <div className="banner-content">
                  <h3>Payments Awaiting Verification</h3>
                  <p>There are {filteredPayments.filter(p => p.status === 'unverified').length} payments that need verification.</p>
                </div>
              </div>
            )}
            
            <table className="payments-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Plan</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr 
                    key={payment.id}
                    className={`status-${payment.status}`}
                  >
                    <td className="user-cell">
                      <div className="user-name">{payment.userName}</div>
                      <div className="user-email">{payment.userEmail}</div>
                    </td>
                    <td className="reference-cell">{payment.referenceNumber}</td>
                    <td className="amount-cell">{payment.currency} {payment.amount}</td>
                    <td className="plan-cell">{payment.planName}</td>
                    <td className="date-cell">{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td className={`status-cell status-${payment.status}`}>
                      {payment.status === 'verified' ? 'Verified' : 
                       payment.status === 'unverified' ? 'Pending Verification' : 
                       payment.status === 'rejected' ? 'Rejected' :
                       payment.status === 'cancelled' ? 'Cancelled' :
                       payment.status === 'inactive' ? 'Inactive' :
                       payment.status === 'active' ? 'Active' :
                       payment.status === 'paid' ? 'Paid' : payment.status}
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="view-details-btn"
                        onClick={() => handleViewDetails(payment)}
                      >
                        View Details
                      </button>
                      
                      {payment.status === 'unverified' && (
                        <div className="quick-actions">
                          <button 
                            className="verify-btn"
                            title="Verify Payment"
                            onClick={() => handleOpenVerificationModal(payment)}
                          >
                            ✓
                          </button>
                          <button 
                            className="reject-btn"
                            title="Reject Payment"
                            onClick={() => handleOpenRejectionModal(payment)}
                          >
                            ✗
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Details Modal - This likely already exists */}
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

      {/* Add Reference Matcher Modal */}
      <ReferenceMatcherModal
        isOpen={isReferenceMatcherModalOpen}
        onClose={() => setIsReferenceMatcherModalOpen(false)}
        extractedReferences={extractedReferences}
        onVerifyAll={(references) => handleVerifyMatchedPayments(references)}
      />
    </div>
  );
};

// Define the ReferenceMatcherModal component
const ReferenceMatcherModal: React.FC<ReferenceMatcherModalProps> = ({
  isOpen,
  onClose,
  extractedReferences,
  onVerifyAll
}) => {
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      // Initialize selectedReferences with all reference numbers if extractedReferences changes
      const allRefs = extractedReferences.map(ref => ref.referenceNumber);
      setSelectedReferences(allRefs);
      setSelectAll(true);
    } else {
      // Reset selection when modal closes
      setSelectedReferences([]);
      setSelectAll(false);
    }
  }, [isOpen, extractedReferences]);
  
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReferences([]);
    } else {
      setSelectedReferences(extractedReferences.map(ref => ref.referenceNumber));
    }
    setSelectAll(!selectAll);
  };
  
  const handleReferenceToggle = (referenceNumber: string) => {
    if (selectedReferences.includes(referenceNumber)) {
      setSelectedReferences(selectedReferences.filter(ref => ref !== referenceNumber));
      setSelectAll(false);
    } else {
      setSelectedReferences([...selectedReferences, referenceNumber]);
      if (selectedReferences.length + 1 === extractedReferences.length) {
        setSelectAll(true);
      }
    }
  };
  
  const totalMatches = extractedReferences.reduce(
    (total, ref) => total + ref.matches.length, 0
  );
  
  if (!isOpen) return null;
  
  return (
    <div className="payment-details-modal-backdrop">
      <div className="payment-details-modal reference-matcher-modal">
        <button className="close-button" onClick={onClose}>&times;</button>
        
        <h2>Matching References Found</h2>
        
        <div className="reference-matches-summary">
          <p>Found <strong>{extractedReferences.length}</strong> references matching <strong>{totalMatches}</strong> pending payments.</p>
          
          <div className="select-all-container">
            <label>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
              />
              Select All References
            </label>
          </div>
        </div>
        
        <div className="reference-matches-list">
          {extractedReferences.map((ref) => (
            <div key={ref.referenceNumber} className="reference-match-item">
              <div className="reference-match-header">
                <label className="reference-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedReferences.includes(ref.referenceNumber)}
                    onChange={() => handleReferenceToggle(ref.referenceNumber)}
                  />
                  <span className="reference-number">{ref.referenceNumber}</span>
                </label>
                <div className="reference-meta">
                  <span className="reference-date">{new Date(ref.date).toLocaleDateString()}</span>
                  <span className="reference-amount">{ref.amount}</span>
                </div>
              </div>
              
              <div className="matched-payments">
                <h4>Matching Pending Payments ({ref.matches.length})</h4>
                <ul>
                  {ref.matches.map((payment) => (
                    <li key={payment.id} className="matched-payment">
                      <div className="user-info">
                        <strong>{payment.userName}</strong>
                        <span>{payment.userEmail}</span>
                        {payment.userSubscriptionStatus === 'active' && (
                          <span className="user-status active-status">Active Subscription</span>
                        )}
                      </div>
                      <div className="payment-info">
                        <span className="payment-amount">{payment.currency} {payment.amount}</span>
                        <span className="payment-plan">{payment.planName}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        
        <div className="modal-actions">
          <button
            className="cancel-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="verify-all-button"
            onClick={() => onVerifyAll(selectedReferences)}
            disabled={selectedReferences.length === 0}
          >
            Verify {selectedReferences.length} Selected References
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsManagement;
