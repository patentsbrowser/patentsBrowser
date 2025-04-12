import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as SubscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
// import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useAuth } from '../../AuthContext';
import { QRCodeSVG } from 'qrcode.react';

interface Plan {
  _id: string;
  name: string;
  type: string;
  price: number;
  discountPercentage: number;
  features: string[];
  popular: boolean;
}

interface Subscription {
  _id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  trialEndsAt?: string;
}

interface PaymentLinkState {
  planId: string;
  paymentLink: string;
  planName: string;
}

const SubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkState | null>(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const result = await SubscriptionService.getSubscriptionPlans();
        if (result.success) {
          setPlans(result.data);
        }
      } catch (error) {
        toast.error('Failed to load subscription plans');
        console.error('Error fetching plans:', error);
      }
    };

    const initialize = async () => {
      setLoading(true);
      await fetchPlans();
      setLoading(false);
    };

    initialize();

    // Check if the current URL includes callback parameters from Google Pay
    if (location.pathname === '/subscription/callback') {
      handlePaymentCallback();
    }
  }, [location.pathname]);

  // Handle the callback from Google Pay
  const handlePaymentCallback = async () => {
    try {
      // Get URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const paymentId = urlParams.get('paymentId');
      const orderId = urlParams.get('orderId');
      const transactionId = urlParams.get('transactionId');
      const signature = urlParams.get('signature');
      const planId = urlParams.get('planId');
      const status = urlParams.get('status');

      if (status === 'success' && paymentId && orderId && transactionId && signature && planId) {
        // Process successful payment
        const activateResult = await SubscriptionService.activateSubscription({
          paymentId,
          orderId,
          transactionId,
          signature,
          planId
        });
        
        if (activateResult.success) {
          toast.success('Subscription activated successfully!');
          setSubscription(activateResult.data);
          // Redirect to remove query params
          navigate('/subscription', { replace: true });
        } else {
          toast.error('Failed to activate subscription');
        }
      } else if (status === 'failure') {
        toast.error('Payment failed. Please try again.');
        navigate('/subscription', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error processing payment callback');
      navigate('/subscription', { replace: true });
    }
  };

  const handleStartTrial = async () => {
    if (!isAuthenticated) {
      navigate('/auth/signup?redirect=subscription');
      return;
    }

    try {
      setProcessingPayment(true);
      const result = await SubscriptionService.startFreeTrial();
      if (result.success) {
        toast.success('Free trial started successfully!');
        setSubscription(result.data.subscription);
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start free trial');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!isAuthenticated) {
      navigate('/auth/signup?redirect=subscription');
      return;
    }

    try {
      setProcessingPayment(true);
      // Clear any previous payment link
      setPaymentLink(null);
      
      const orderResult = await SubscriptionService.createSubscriptionOrder(plan._id);
      
      if (!orderResult.success) {
        toast.error('Failed to create order');
        setProcessingPayment(false);
        return;
      }

      const { paymentInfo } = orderResult.data;

      // Handle Google Pay link - this will either open Google Pay on mobile
      // or return the link for QR code on desktop
      const result = await SubscriptionService.handleGooglePayLink(paymentInfo.deepLink);
      
      if (typeof result === 'string') {
        // It's a desktop user, show QR code
        setPaymentLink({
          planId: plan._id,
          paymentLink: result,
          planName: plan.name
        });
      } else if (result === false) {
        toast.error('Failed to process payment. Please try again.');
      }
      
      setProcessingPayment(false);
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process subscription');
      setProcessingPayment(false);
    }
  };

  const handleCloseQRCode = () => {
    setPaymentLink(null);
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      const result = await SubscriptionService.cancelSubscription();
      if (result.success) {
        toast.success('Subscription cancelled successfully');
        // Update local subscription state with cancelled status
        setSubscription({
          ...subscription!,
          status: 'cancelled'
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  const copyPaymentLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink.paymentLink)
        .then(() => toast.success('Payment link copied to clipboard'))
        .catch(() => toast.error('Failed to copy link'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="subscription-page loading">Loading subscription plans...</div>;
  }

  return (
    <div className="subscription-page">
      {paymentLink && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="payment-modal-header">
              <h2>Payment for {paymentLink.planName} Plan</h2>
              <button className="close-button" onClick={handleCloseQRCode}>×</button>
            </div>
            <div className="payment-modal-body">
              <p>Scan this QR code with your mobile device to pay with Google Pay:</p>
              <div className="qr-code-container">
                <QRCodeSVG value={paymentLink.paymentLink} size={250} />
              </div>
              <p>Or use this payment link:</p>
              <div className="payment-link-container">
                <input
                  type="text"
                  value={paymentLink.paymentLink}
                  readOnly
                  className="payment-link-input"
                />
                <button className="copy-link-btn" onClick={copyPaymentLink}>
                  Copy
                </button>
              </div>
              <p className="payment-instructions">
                After completing the payment on your mobile device, return to this page to view your active subscription.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="subscription-header">
        <h1>Subscription Plans</h1>
        <p>Choose the perfect plan for your patent search needs</p>
      </div>

      {subscription && subscription.status !== 'inactive' && (
        <div className="current-subscription">
          <h2>Your Current Subscription</h2>
          <div className="subscription-details">
            <p><strong>Plan:</strong> {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1).replace('_', ' ')}</p>
            <p><strong>Status:</strong> {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}</p>
            <p><strong>Start Date:</strong> {formatDate(subscription.startDate)}</p>
            <p><strong>End Date:</strong> {formatDate(subscription.endDate)}</p>
            {subscription.trialEndsAt && <p><strong>Trial Ends:</strong> {formatDate(subscription.trialEndsAt)}</p>}
            
            {subscription.status === 'active' && (
              <button 
                className="cancel-subscription-btn"
                onClick={handleCancelSubscription}
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      )}

      {(!subscription || subscription.status === 'inactive' || subscription.status === 'cancelled') && (
        <div className="free-trial-card">
          <h2>Start with our 14-Day Free Trial</h2>
          <p>Try all features with no commitment. No credit card required.</p>
          <ul className="trial-features">
            <li>Full search functionality</li>
            <li>Save up to 10 patents</li>
            <li>Basic analytics tools</li>
            <li>Email support</li>
          </ul>
          <button 
            className="start-trial-btn"
            onClick={handleStartTrial}
            disabled={processingPayment}
          >
            {processingPayment ? 'Processing...' : 'Start Free Trial'}
          </button>
        </div>
      )}

      <div className="subscription-plans">
        {plans.map((plan) => (
          <div 
            key={plan._id} 
            className={`plan-card ${plan.popular ? 'popular' : ''}`}
          >
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            <h3>{plan.name}</h3>
            <div className="price">
              <span className="currency">$</span>
              <span className="amount">{plan.price}</span>
              <span className="period">/{plan.type === 'monthly' ? 'month' : 
                plan.type === 'quarterly' ? '3 months' : 
                plan.type === 'half_yearly' ? '6 months' : 'year'}</span>
            </div>
            {plan.discountPercentage > 0 && (
              <div className="discount">{plan.discountPercentage}% discount</div>
            )}
            <ul className="features">
              {plan.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <button 
              className="google-pay-btn"
              onClick={() => handleSubscribe(plan)}
              disabled={processingPayment || (subscription?.status === 'active')}
            >
              <img 
                src="https://developers.google.com/static/pay/api/images/google-pay-mark.svg" 
                alt="Google Pay" 
                className="gpay-logo" 
              />
              {processingPayment ? 'Processing...' : 'Pay with Google Pay'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage; 