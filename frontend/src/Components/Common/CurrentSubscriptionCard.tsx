import React from 'react';
import './CurrentSubscriptionCard.scss';

interface SubscriptionData {
  subscriptionId: string;
  plan: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isPendingPayment?: boolean;
  trialDaysRemaining?: number;
}

interface UserSubscriptionResponse {
  success: boolean;
  data: SubscriptionData;
}

interface CurrentSubscriptionCardProps {
  userSubscription: UserSubscriptionResponse | null;
  loading?: boolean;
  error?: string;
}

const CurrentSubscriptionCard: React.FC<CurrentSubscriptionCardProps> = ({
  userSubscription,
  loading = false,
  error = null
}) => {
  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const calculateDaysLeft = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadgeClass = (status: string, isPending?: boolean) => {
    if (isPending) return 'pending';
    switch (status.toLowerCase()) {
      case 'active': return 'active';
      case 'trial': return 'trial';
      case 'expired': return 'expired';
      case 'cancelled': return 'cancelled';
      case 'rejected': return 'rejected';
      default: return 'inactive';
    }
  };

  const getStatusText = (status: string, isPending?: boolean) => {
    if (isPending) return 'Payment Pending';
    switch (status.toLowerCase()) {
      case 'active': return 'Active';
      case 'trial': return 'Free Trial';
      case 'expired': return 'Expired';
      case 'cancelled': return 'Cancelled';
      case 'rejected': return 'Payment Rejected';
      default: return 'Inactive';
    }
  };

  const getPlanTypeDisplay = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'monthly': return 'Monthly Plan';
      case 'quarterly': return 'Quarterly Plan';
      case 'half_yearly': return 'Half-Yearly Plan';
      case 'yearly': return 'Yearly Plan';
      case 'trial': return 'Free Trial';
      default: return plan;
    }
  };

  if (loading) {
    return (
      <div className="current-subscription-card loading">
        <div className="loading-spinner"></div>
        <p>Loading subscription details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="current-subscription-card error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  if (!userSubscription?.success || !userSubscription?.data) {
    return (
      <div className="current-subscription-card no-subscription">
        <div className="no-subscription-icon">📋</div>
        <h3>No Active Subscription</h3>
        <p>You don't have any active subscription. Choose a plan below to get started!</p>
      </div>
    );
  }

  const subscription = userSubscription.data;
  const daysLeft = calculateDaysLeft(subscription.endDate);
  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft <= 0;

  return (
    <div className="current-subscription-card">
      <div className="card-header">
        <h2>Current Subscription</h2>
        <span className={`status-badge ${getStatusBadgeClass(subscription.status, subscription.isPendingPayment)}`}>
          {getStatusText(subscription.status, subscription.isPendingPayment)}
        </span>
      </div>

      <div className="subscription-details">
        <div className="plan-info">
          <h3>{subscription.planName}</h3>
          <p className="plan-type">{getPlanTypeDisplay(subscription.plan)}</p>
        </div>

        <div className="date-info">
          <div className="date-item">
            <span className="date-label">Started:</span>
            <span className="date-value">{formatDate(subscription.startDate)}</span>
          </div>
          <div className="date-item">
            <span className="date-label">Expires:</span>
            <span className="date-value">{formatDate(subscription.endDate)}</span>
          </div>
        </div>

        <div className={`time-remaining ${isExpiringSoon ? 'warning' : isExpired ? 'expired' : ''}`}>
          <div className="days-left">{Math.max(0, daysLeft)}</div>
          <div className="days-label">
            {isExpired ? 'Expired' : daysLeft === 1 ? 'day remaining' : 'days remaining'}
          </div>
        </div>
      </div>

      {subscription.isPendingPayment && (
        <div className="pending-notice">
          <div className="pending-icon">⏳</div>
          <div className="pending-message">
            <p><strong>Payment Verification in Progress</strong></p>
            <p>Your payment is being verified. You can continue using the trial version until verification is complete.</p>
          </div>
        </div>
      )}

      {subscription.status === 'trial' && subscription.trialDaysRemaining && (
        <div className="trial-notice">
          <div className="trial-icon">🎯</div>
          <div className="trial-message">
            <p><strong>Free Trial Active</strong></p>
            <p>Enjoy full access to all features during your trial period.</p>
          </div>
        </div>
      )}

      {isExpiringSoon && !isExpired && (
        <div className="expiry-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-message">
            <p><strong>Subscription Expiring Soon!</strong></p>
            <p>Your subscription will expire in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}. Renew now to continue enjoying our services.</p>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="expired-notice">
          <div className="expired-icon">❌</div>
          <div className="expired-message">
            <p><strong>Subscription Expired</strong></p>
            <p>Your subscription has expired. Please renew to continue using our services.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentSubscriptionCard;
