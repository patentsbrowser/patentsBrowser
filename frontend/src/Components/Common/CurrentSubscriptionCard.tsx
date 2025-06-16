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
  trialStartDate?: string;
  trialEndDate?: string;
  subscriptionType?: 'trial' | 'paid';
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

  const calculateTrialDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateTrialProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();

    if (elapsed <= 0) return 0;
    if (elapsed >= totalDuration) return 100;

    return (elapsed / totalDuration) * 100;
  };

  const getTrialStatusMessage = (daysLeft: number, status: string) => {
    if (status !== 'trial') return null;

    if (daysLeft <= 0) {
      return {
        type: 'expired',
        message: 'Your trial has expired. Upgrade to continue using our services.'
      };
    } else if (daysLeft <= 3) {
      return {
        type: 'warning',
        message: `Your trial expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}. Upgrade now to avoid interruption.`
      };
    } else if (daysLeft <= 7) {
      return {
        type: 'info',
        message: `${daysLeft} days remaining in your trial. Consider upgrading for continued access.`
      };
    }

    return {
      type: 'success',
      message: `Enjoy your trial! ${daysLeft} days remaining to explore all features.`
    };
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
        <div className="no-subscription-features">
          <h4>What you'll get with a subscription:</h4>
          <ul>
            <li>✅ Unlimited patent searches</li>
            <li>✅ Advanced filtering options</li>
            <li>✅ Export capabilities</li>
            <li>✅ Priority support</li>
          </ul>
        </div>
      </div>
    );
  }

  const subscription = userSubscription.data;
  const daysLeft = calculateDaysLeft(subscription.endDate);
  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft <= 0;

  // Debug logs
  console.log('CurrentSubscriptionCard - userSubscription:', userSubscription);
  console.log('CurrentSubscriptionCard - subscription data:', subscription);
  console.log('CurrentSubscriptionCard - daysLeft:', daysLeft);

  return (
    <div className="current-subscription-card compact">
      <div className="card-header">
        <h2>Current Subscription</h2>
        <span className={`status-badge ${getStatusBadgeClass(subscription.status, subscription.isPendingPayment)}`}>{getStatusText(subscription.status, subscription.isPendingPayment)}</span>
      </div>
      <div className="subscription-details compact-grid">
        <div className="plan-info">
          <h3>{subscription.planName}</h3>
          <p className="plan-type">{getPlanTypeDisplay(subscription.plan)}</p>
          {subscription.status === 'trial' && (
            <span className="trial-badge"><span className="trial-icon">🎯</span> Free Trial</span>
          )}
        </div>
        <div className="overview-item">
          <span className="overview-label">Status</span>
          <span className={`overview-value status-${subscription.status}`}>{getStatusText(subscription.status, subscription.isPendingPayment)}</span>
        </div>
        <div className="overview-item">
          <span className="overview-label">Started</span>
          <span className="overview-value">{formatDate(subscription.startDate)}</span>
        </div>
        <div className="overview-item">
          <span className="overview-label">Expires</span>
          <span className="overview-value">{formatDate(subscription.endDate)}</span>
        </div>
        <div className="overview-item">
          <span className="overview-label">Days Left</span>
          <span className={`overview-value ${daysLeft <= 7 ? 'warning' : daysLeft <= 0 ? 'expired' : 'active'}`}>{Math.max(0, daysLeft)}</span>
        </div>
        {subscription.status === 'trial' && (
          <div className="overview-item trial-progress-inline">
            <span className="overview-label">Trial Progress</span>
            <div className="progress-bar-small">
              <div className="progress-bar-fill" style={{ width: `${calculateTrialProgress(subscription.startDate, subscription.endDate)}%` }}></div>
            </div>
            <span className="progress-text">{Math.round(calculateTrialProgress(subscription.startDate, subscription.endDate))}%</span>
          </div>
        )}
      </div>
      {/* Trial details section (restored) */}
      {subscription.status === 'trial' && (
        <div className="trial-details compact">
          <div className="trial-stats">
            <div className="stat-item"><span className="stat-label">Days Used:</span> <span className="stat-value">{calculateTrialDuration(subscription.startDate, subscription.endDate) - Math.max(0, daysLeft)}</span></div>
            <div className="stat-item"><span className="stat-label">Days Remaining:</span> <span className="stat-value">{Math.max(0, daysLeft)}</span></div>
            <div className="stat-item"><span className="stat-label">Total Trial:</span> <span className="stat-value">{calculateTrialDuration(subscription.startDate, subscription.endDate)} days</span></div>
          </div>
          <div className="trial-features">
            <h5>What's included in your trial:</h5>
            <ul>
              <li>🔍 Unlimited patent searches</li>
              <li>📊 Advanced analytics</li>
              <li>📁 Export capabilities</li>
              <li>🎯 Priority support</li>
            </ul>
          </div>
          {(() => {
            const statusMessage = getTrialStatusMessage(daysLeft, subscription.status);
            return statusMessage && (
              <div className={`trial-status-message ${statusMessage.type}`}><p>{statusMessage.message}</p></div>
            );
          })()}
        </div>
      )}
      {isExpiringSoon && !isExpired && (
        <div className="expiry-warning compact">
          <span className="warning-icon">⚠️</span>
          <span className="warning-message">Expiring in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}</span>
        </div>
      )}
      {isExpired && (
        <div className="expired-notice compact">
          <span className="expired-icon">❌</span>
          <span className="expired-message">Subscription Expired</span>
        </div>
      )}
    </div>
  );
};

export default CurrentSubscriptionCard;
