import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import './Admin.scss';

interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  referenceNumber: string;
  amount: number;
  status: 'verified' | 'unverified' | 'rejected';
  screenshotUrl?: string;
  createdAt: string;
  verifiedAt?: string;
}

interface ExtractedUTR {
  number: string;
  date?: string;
  amount?: number;
}

const SubscriptionsManagement = () => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedUtrs, setExtractedUtrs] = useState<ExtractedUTR[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<{success: number, failed: number} | null>(null);

  // Fetch payments data
  const { data: payments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['adminPayments'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/subscription/payments`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return response.data.data.payments || [];
      } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
      }
    }
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Upload and process PDF
  const handleUploadPDF = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('pdfFile', selectedFile);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/subscription/upload-utr-pdf`, 
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          }
        }
      );
      
      if (response.data.success) {
        setExtractedUtrs(response.data.data.utrs);
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Failed to upload PDF. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Process UTR matching
  const handleProcessUTRs = async () => {
    if (extractedUtrs.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/subscription/process-utrs`,
        { utrs: extractedUtrs },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setProcessingResult({
          success: response.data.data.matched,
          failed: response.data.data.unmatched
        });
        // Refresh payments data after processing
        refetch();
      }
    } catch (error) {
      console.error('Error processing UTRs:', error);
      alert('Failed to process UTRs. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Status update mutation
  const updatePaymentStatus = useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: 'verified' | 'rejected' | 'unverified' }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/subscription/payments/${paymentId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch payments data
      queryClient.invalidateQueries({ queryKey: ['adminPayments'] });
    },
    onError: (error) => {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status. Please try again.');
    }
  });

  // Handle payment verification
  const handleVerifyPayment = (paymentId: string, status: 'verified' | 'rejected') => {
    updatePaymentStatus.mutate({ paymentId, status });
  };

  // Filter payments based on status and search term
  const filteredPayments = payments && payments.length ? payments.filter((payment: Payment) => {
    // Filter by status
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    
    // Filter by search term (user name, email, or reference number)
    const matchesSearch = 
      payment.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  }) : [];

  return (
    <div className="admin-subscriptions-container">
      <div className="admin-header">
        <h1>Subscriptions Management</h1>
        <div className="admin-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="status-filter">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="utr-uploader-section">
        <h2>UTR PDF Processor</h2>
        <p>Upload bank statement PDF to extract UTRs and automatically verify payments</p>
        
        <div className="utr-upload-container">
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <span className="selected-file">
              {selectedFile ? selectedFile.name : 'No file selected'}
            </span>
          </div>
          
          <button
            className="upload-btn"
            onClick={handleUploadPDF}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload & Extract UTRs'}
          </button>
        </div>
        
        {extractedUtrs.length > 0 && (
          <div className="extracted-utrs-container">
            <h3>Extracted UTRs ({extractedUtrs.length})</h3>
            <div className="utrs-table-container">
              <table className="utrs-table">
                <thead>
                  <tr>
                    <th>UTR Number</th>
                    <th>Date</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedUtrs.map((utr, index) => (
                    <tr key={index}>
                      <td>{utr.number}</td>
                      <td>{utr.date || 'N/A'}</td>
                      <td>{utr.amount ? `₹${utr.amount}` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="process-utr-actions">
              <button
                className="process-btn"
                onClick={handleProcessUTRs}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Process UTR Matching'}
              </button>
              
              {processingResult && (
                <div className="processing-result">
                  <span className="success-count">✅ {processingResult.success} matched</span>
                  <span className="failed-count">❌ {processingResult.failed} unmatched</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="payments-section">
        <h2>Payment Verifications</h2>
        
        {isLoading ? (
          <div className="loading-state">Loading payments...</div>
        ) : error ? (
          <div className="error-state">Error loading payments. Please try again.</div>
        ) : filteredPayments.length === 0 && !searchTerm && filterStatus === 'all' ? (
          <div className="no-data-state">
            <div className="no-data-message">
              <span className="no-data-icon">📋</span>
              <h3>No payment data available</h3>
              <p>There are no payment records to display. New payments will appear here once users make payments.</p>
            </div>
          </div>
        ) : (
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Reference Number</th>
                  <th>Amount</th>
                  <th>Screenshot</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment: Payment) => (
                    <tr key={payment.id} className={`status-${payment.status}`}>
                      <td>
                        <div className="user-info">
                          <strong>{payment.userName}</strong>
                          <span>{payment.userEmail}</span>
                        </div>
                      </td>
                      <td className="reference-number">{payment.referenceNumber}</td>
                      <td>₹{payment.amount}</td>
                      <td>
                        {payment.screenshotUrl ? (
                          <div className="screenshot-thumbnail">
                            <img
                              src={`${import.meta.env.VITE_API_URL}${payment.screenshotUrl}`}
                              alt="Payment screenshot"
                              onClick={() => window.open(`${import.meta.env.VITE_API_URL}${payment.screenshotUrl}`, '_blank')}
                            />
                          </div>
                        ) : (
                          <span className="no-screenshot">No screenshot</span>
                        )}
                      </td>
                      <td>
                        <span className={`payment-status status-${payment.status}`}>
                          {payment.status === 'verified' && '✅ Verified'}
                          {payment.status === 'unverified' && '⏳ Unverified'}
                          {payment.status === 'rejected' && '❌ Rejected'}
                        </span>
                      </td>
                      <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        {payment.status === 'unverified' && (
                          <>
                            <button
                              className="action-btn verify-btn"
                              onClick={() => handleVerifyPayment(payment.id, 'verified')}
                              disabled={updatePaymentStatus.isPending}
                            >
                              Verify
                            </button>
                            <button
                              className="action-btn reject-btn"
                              onClick={() => handleVerifyPayment(payment.id, 'rejected')}
                              disabled={updatePaymentStatus.isPending}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {payment.status !== 'unverified' && (
                          <button
                            className="action-btn reset-btn"
                            onClick={() => handleVerifyPayment(payment.id, 'unverified')}
                            disabled={updatePaymentStatus.isPending}
                          >
                            Reset
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="no-payments-message">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'No payments match your search or filter.' 
                        : 'No payments found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsManagement; 