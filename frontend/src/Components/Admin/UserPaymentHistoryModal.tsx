import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Admin.scss';
import Loader from '../Common/Loader';
import toast from 'react-hot-toast';

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  planName: string;
  planDuration: string;
  referenceNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  transactionDate: string;
  orderId: string;
  adminMessage?: string;
}

interface UserPaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const UserPaymentHistoryModal: React.FC<UserPaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
}) => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserPaymentHistory();
    }
  }, [isOpen, userId]);

  const fetchUserPaymentHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/users/${userId}/payment-history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.statusCode === 200) {
        setPaymentHistory(response.data.data || []);
      } else {
        setError('Failed to load payment history');
        toast.error('Failed to load payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Error loading payment history. Please try again later.');
      toast.error('Error loading payment history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'payment_pending':
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getDisplayStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'payment_pending':
      case 'pending':
        return 'Approval Pending';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      case 'paid':
        return 'Paid';
      case 'inactive':
        return 'Inactive';
      case 'trial':
        return 'Trial';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = paymentHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(paymentHistory.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content payment-history-modal">
        <div className="modal-header">
          <h2>Payment History - {userName}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <Loader fullScreen={false} text="Loading payment history..." />
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : paymentHistory.length === 0 ? (
            <div className="empty-state">
              <p>No payment records found for this user.</p>
            </div>
          ) : (
            <>
              <div className="payment-list">
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Transaction ID</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Admin Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((payment, index) => (
                      <tr key={payment.id}>
                        <td className="sr-no">{indexOfFirstItem + index + 1}</td>
                        <td className="plan-info">
                          <span className="plan-name">{payment.planName}</span>
                        </td>
                        <td className="amount">
                          {payment.currency} {payment.amount}
                        </td>
                        <td className="reference-number">
                          {payment.referenceNumber}
                        </td>
                        <td className="transaction-date">
                          {formatDate(payment.transactionDate)}
                        </td>
                        <td className={`status ${getStatusClass(payment.status)}`}>
                          {getDisplayStatus(payment.status)}
                        </td>
                        <td className="admin-message">
                          {payment.adminMessage || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => paginate(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="pagination-button"
                  >
                    &laquo; Prev
                  </button>
                  
                  <div className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`page-number ${currentPage === number ? 'active' : ''}`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => paginate(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="pagination-button"
                  >
                    Next &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPaymentHistoryModal; 