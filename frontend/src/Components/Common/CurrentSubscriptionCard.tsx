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
    <div className="current-subscription-card" style={{
      background: '#1a1a2e',
      border: '2px solid #7c4dff',
      borderRadius: '20px',
      padding: '3rem',
      marginBottom: '3rem',
      color: '#f5f5f7',
      minHeight: '600px',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto 3rem auto'
    }}>
      <div className="card-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '3rem',
        paddingBottom: '2rem',
        borderBottom: '2px solid rgba(124, 77, 255, 0.3)'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#f5f5f7',
          margin: '0',
          background: 'linear-gradient(135deg, #7c4dff, #448aff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Current Subscription Details</h2>
        <span className={`status-badge ${getStatusBadgeClass(subscription.status, subscription.isPendingPayment)}`} style={{
          padding: '1rem 2rem',
          borderRadius: '25px',
          fontSize: '1.2rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          background: subscription.status === 'trial' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          boxShadow: '0 4px 15px rgba(124, 77, 255, 0.3)'
        }}>
          {getStatusText(subscription.status, subscription.isPendingPayment)}
        </span>
      </div>

      <div className="subscription-details" style={{
        display: 'grid',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        <div className="plan-info" style={{
          background: 'rgba(124, 77, 255, 0.1)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(124, 77, 255, 0.3)'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#f5f5f7',
            marginBottom: '0.5rem'
          }}>{subscription.planName}</h3>
          <p className="plan-type" style={{
            color: '#bdbdbd',
            fontSize: '1rem',
            fontWeight: '500',
            marginBottom: '1rem'
          }}>{getPlanTypeDisplay(subscription.plan)}</p>
          {subscription.status === 'trial' && (
            <div className="trial-badge" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(124, 77, 255, 0.2)',
              color: '#7c4dff',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: '600',
              border: '1px solid rgba(124, 77, 255, 0.4)'
            }}>
              <span className="trial-icon">🎯</span>
              <span>Free Trial Period</span>
            </div>
          )}
        </div>

        <div className="subscription-overview" style={{
          background: 'rgba(124, 77, 255, 0.05)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(124, 77, 255, 0.2)',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{
            color: '#f5f5f7',
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>Subscription Overview</h4>
          <div className="overview-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem'
          }}>
            <div className="overview-item" style={{
              textAlign: 'center',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(124, 77, 255, 0.2)'
            }}>
              <span className="overview-label" style={{
                display: 'block',
                fontSize: '0.8rem',
                color: '#bdbdbd',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Status</span>
              <span className={`overview-value status-${subscription.status}`} style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '700',
                color: subscription.status === 'trial' ? '#7c4dff' : '#22c55e'
              }}>
                {getStatusText(subscription.status, subscription.isPendingPayment)}
              </span>
            </div>
            <div className="overview-item" style={{
              textAlign: 'center',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(124, 77, 255, 0.2)'
            }}>
              <span className="overview-label" style={{
                display: 'block',
                fontSize: '0.8rem',
                color: '#bdbdbd',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Plan Type</span>
              <span className="overview-value" style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '700',
                color: '#f5f5f7'
              }}>{getPlanTypeDisplay(subscription.plan)}</span>
            </div>
            <div className="overview-item" style={{
              textAlign: 'center',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(124, 77, 255, 0.2)'
            }}>
              <span className="overview-label" style={{
                display: 'block',
                fontSize: '0.8rem',
                color: '#bdbdbd',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Duration</span>
              <span className="overview-value" style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '700',
                color: '#f5f5f7'
              }}>
                {subscription.status === 'trial'
                  ? `${calculateTrialDuration(subscription.startDate, subscription.endDate)} days trial`
                  : `${Math.ceil((new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                }
              </span>
            </div>
            <div className="overview-item" style={{
              textAlign: 'center',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(124, 77, 255, 0.2)'
            }}>
              <span className="overview-label" style={{
                display: 'block',
                fontSize: '0.8rem',
                color: '#bdbdbd',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Days Remaining</span>
              <span className={`overview-value ${daysLeft <= 7 ? 'warning' : daysLeft <= 0 ? 'expired' : 'active'}`} style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: '700',
                color: daysLeft <= 7 ? '#f59e0b' : daysLeft <= 0 ? '#ef4444' : '#22c55e'
              }}>
                {Math.max(0, daysLeft)} days
              </span>
            </div>
          </div>
        </div>

        <div className="date-info" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div className="date-item" style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            background: 'rgba(124, 77, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(124, 77, 255, 0.2)',
            textAlign: 'center'
          }}>
            <span className="date-label" style={{
              color: '#bdbdbd',
              fontSize: '0.9rem',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              {subscription.status === 'trial' ? 'Trial Started:' : 'Started:'}
            </span>
            <span className="date-value" style={{
              color: '#f5f5f7',
              fontWeight: '600',
              fontSize: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '0.5rem',
              borderRadius: '6px'
            }}>{formatDate(subscription.startDate)}</span>
          </div>
          <div className="date-item" style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            background: 'rgba(124, 77, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(124, 77, 255, 0.2)',
            textAlign: 'center'
          }}>
            <span className="date-label" style={{
              color: '#bdbdbd',
              fontSize: '0.9rem',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              {subscription.status === 'trial' ? 'Trial Expires:' : 'Expires:'}
            </span>
            <span className="date-value" style={{
              color: '#f5f5f7',
              fontWeight: '600',
              fontSize: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '0.5rem',
              borderRadius: '6px'
            }}>{formatDate(subscription.endDate)}</span>
          </div>
        </div>

        {/* Enhanced Trial Duration Display */}
        {subscription.status === 'trial' && (
          <div className="trial-duration-info" style={{
            background: 'rgba(124, 77, 255, 0.1)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(124, 77, 255, 0.3)',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{
              color: '#f5f5f7',
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>Trial Progress</h4>
            <div className="trial-duration-item" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}>
              <span className="duration-label" style={{
                fontSize: '0.9rem',
                color: '#bdbdbd',
                fontWeight: '500'
              }}>Trial Period:</span>
              <span className="duration-value" style={{
                fontSize: '0.9rem',
                color: '#f5f5f7',
                fontWeight: '600',
                background: 'rgba(124, 77, 255, 0.3)',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px'
              }}>
                {calculateTrialDuration(subscription.startDate, subscription.endDate)} days
              </span>
            </div>
            <div className="trial-progress">
              <div className="progress-bar" style={{
                width: '100%',
                height: '12px',
                background: 'rgba(124, 77, 255, 0.2)',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '0.75rem',
                position: 'relative'
              }}>
                <div
                  className="progress-fill"
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #7c4dff 0%, #448aff 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.3s ease',
                    width: `${calculateTrialProgress(subscription.startDate, subscription.endDate)}%`
                  }}
                ></div>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span className="progress-text" style={{
                  fontSize: '0.9rem',
                  color: '#bdbdbd',
                  fontWeight: '500'
                }}>
                  {Math.round(calculateTrialProgress(subscription.startDate, subscription.endDate))}% completed
                </span>
                <span style={{
                  fontSize: '0.9rem',
                  color: '#7c4dff',
                  fontWeight: '600'
                }}>
                  {calculateTrialDuration(subscription.startDate, subscription.endDate) - Math.max(0, daysLeft)} / {calculateTrialDuration(subscription.startDate, subscription.endDate)} days used
                </span>
              </div>
            </div>
          </div>
        )}

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

      {subscription.status === 'trial' && (
        <div className="enhanced-trial-notice">
          <div className="trial-header">
            <div className="trial-icon">🎯</div>
            <div className="trial-title">
              <h4>Free Trial Active</h4>
              <p>Full access to all premium features</p>
            </div>
          </div>

          <div className="trial-details">
            <div className="trial-stats">
              <div className="stat-item">
                <span className="stat-label">Days Used:</span>
                <span className="stat-value">
                  {calculateTrialDuration(subscription.startDate, subscription.endDate) - Math.max(0, daysLeft)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Days Remaining:</span>
                <span className="stat-value">{Math.max(0, daysLeft)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Trial:</span>
                <span className="stat-value">
                  {calculateTrialDuration(subscription.startDate, subscription.endDate)} days
                </span>
              </div>
            </div>

            <div className="trial-features">
              <h5>What's included in your trial:</h5>
              <div className="features-grid">
                <div className="feature-item">
                  <span className="feature-icon">🔍</span>
                  <span>Unlimited patent searches</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span>Advanced analytics</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📁</span>
                  <span>Export capabilities</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <span>Priority support</span>
                </div>
              </div>
            </div>

            {(() => {
              const statusMessage = getTrialStatusMessage(daysLeft, subscription.status);
              return statusMessage && (
                <div className={`trial-status-message ${statusMessage.type}`}>
                  <p>{statusMessage.message}</p>
                </div>
              );
            })()}
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
