import React, { useState, useEffect } from 'react';
import { getUserPaymentHistory } from '../../services/SubscriptionService';
import './PaymentHistory.scss';
import Loader from '../Common/Loader';

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
}

const PaymentHistory: React.FC = () => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getUserPaymentHistory();
      
      if (response.success) {
        setPaymentHistory(response.data || []);
      } else {
        setError('Failed to load payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Error loading payment history. Please try again later.');
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
        return 'Payment Pending';
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
        return status;
    }
  };

  return (
    <div className="payment-history-container">
      <div className="payment-history-header">
        <h2>Payment History</h2>
      </div>

      {isLoading ? (
        <Loader fullScreen={true} text="Loading payment history..." />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : paymentHistory.length === 0 ? (
        <div className="empty-message">No payment history available.</div>
      ) : (
        <div className="payment-list">
          <table className="payment-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Amount</th>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>Valid Until</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((payment) => (
                <tr key={payment.id}>
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
                  <td className="end-date">
                    {formatDate(payment.endDate)}
                  </td>
                  <td className={`status ${getStatusClass(payment.status)}`}>
                    {getDisplayStatus(payment.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory; 