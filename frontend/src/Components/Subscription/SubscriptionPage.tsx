import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as SubscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
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

interface PaymentInfo {
  orderId: string;
  planId: string;
  amount: number;
  planName: string;
  upiLink: string;
}

const SubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

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

    const fetchUserSubscription = async () => {
      if (isAuthenticated) {
        try {
          const result = await SubscriptionService.getUserSubscription();
          if (result.success) {
            setSubscription(result.data);
          }
        } catch (error) {
          console.error('Error fetching user subscription:', error);
        }
      }
    };

    const initialize = async () => {
      setLoading(true);
      await fetchPlans();
      await fetchUserSubscription();
      setLoading(false);
    };

    initialize();
  }, [isAuthenticated]);

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
    // Force check authentication status
    const token = localStorage.getItem('token');
    
    // TEMPORARY TEST MODE: Remove this code when going to production
    // This allows testing without a valid token
    try {
      setProcessingPayment(true);
      // Reset payment info and transaction ref
      setPaymentInfo(null);
      setTransactionRef('');
      
      // For testing: Create a direct UPI link without requiring authentication
      const upiPaymentLink = `upi://pay?pa=9711578183@ybl&pn=${encodeURIComponent('PatentsBrowser')}&am=${plan.price.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`${plan.name} Plan Subscription`)}&tr=order_${Date.now()}`;
      
      // Set payment info for QR code display directly
      setPaymentInfo({
        orderId: `order_${Date.now()}`,
        planId: plan._id,
        amount: plan.price,
        planName: plan.name,
        upiLink: upiPaymentLink
      });
      
      setProcessingPayment(false);
      return;
      // END OF TEST MODE CODE
      
      // Normal code flow:
      if (!token || token === "undefined" || !isAuthenticated) {
        toast.error('Please log in to continue');
        navigate('/auth/login?redirect=subscription');
        return;
      }
      
      const orderResult = await SubscriptionService.createSubscriptionOrder(plan._id);
      
      if (!orderResult.success) {
        // Check if it's an authentication error
        if (orderResult.message?.toLowerCase().includes('authenticate') || 
            orderResult.message?.toLowerCase().includes('login') ||
            orderResult.message?.toLowerCase().includes('unauthorized')) {
          toast.error('Your session has expired. Please log in again.');
          navigate('/auth/login?redirect=subscription');
        } else {
          toast.error(orderResult.message || 'Failed to create order');
        }
        setProcessingPayment(false);
        return;
      }

      const { paymentInfo: paymentData, plan: planDetails, orderId } = orderResult.data;

      // Set payment info for QR code display
      setPaymentInfo({
        orderId: orderId,
        planId: plan._id,
        amount: planDetails.amount,
        planName: plan.name,
        upiLink: paymentData.upiLink
      });
      
      setProcessingPayment(false);
      
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.response?.data?.message || 'Failed to process subscription');
      setProcessingPayment(false);
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentInfo || !transactionRef.trim()) {
      toast.error('Please enter the UPI transaction reference ID');
      return;
    }
    
    try {
      setVerifying(true);
      
      // TEMPORARY TEST MODE: Allow direct verification without backend
      // Remove this when going to production
      if (transactionRef.trim().length >= 6) {
        // Simulate successful verification
        toast.success('Subscription activated successfully!');
        
        // Create a mock subscription object
        const mockSubscription = {
          _id: `sub_${Date.now()}`,
          plan: paymentInfo.planName.toLowerCase().replace('-', '_'),
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        };
        
        setSubscription(mockSubscription);
        setPaymentInfo(null);
        setTransactionRef('');
        
        // Don't redirect for demo purposes
        // navigate('/dashboard');
        
        setVerifying(false);
        return;
      } else {
        toast.error('Transaction reference must be at least 6 characters');
        setVerifying(false);
        return;
      }
      // END OF TEST MODE CODE
      
      // Normal code flow:
      const verifyResult = await SubscriptionService.verifyAndActivateSubscription({
        transactionRef: transactionRef.trim(),
        orderId: paymentInfo.orderId,
        planId: paymentInfo.planId
      });
      
      if (verifyResult.success) {
        toast.success('Subscription activated successfully!');
        setSubscription(verifyResult.data);
        setPaymentInfo(null);
        setTransactionRef('');
        
        // Redirect to dashboard after successful payment
        navigate('/dashboard');
      } else {
        toast.error(verifyResult.message || 'Failed to verify payment');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error verifying payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleClosePaymentModal = () => {
    setPaymentInfo(null);
    setTransactionRef('');
  };

  const formatIndianPrice = (price: number): string => {
    return price.toLocaleString('en-IN');
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
      {paymentInfo && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="payment-modal-header">
              <h2>{paymentInfo.planName} Plan - ₹{formatIndianPrice(paymentInfo.amount)}</h2>
              <button className="close-button" onClick={handleClosePaymentModal}>×</button>
            </div>
            <div className="payment-modal-body">
              <div className="qr-code-container">
                <div className="qr-code-wrapper">
                  <QRCodeSVG value={paymentInfo.upiLink} size={250} />
                </div>
                <div className="payment-info">
                  <h3>Scan to Pay</h3>
                  <p className="amount">₹{formatIndianPrice(paymentInfo.amount)}</p>
                  <p className="plan-name">{paymentInfo.planName} Plan</p>
                </div>
              </div>
              
              <div className="payment-instructions">
                <h4>Instructions:</h4>
                <ol>
                  <li>Scan this QR code with any UPI app (Google Pay, PhonePe, etc.)</li>
                  <li>Complete the payment</li>
                  <li>Enter the UPI Reference ID or Transaction ID below</li>
                </ol>
              </div>
              
              <form onSubmit={handleVerifyPayment} className="transaction-form">
                <div className="input-group">
                  <label htmlFor="transactionRef">UPI Transaction Reference ID:</label>
                  <input
                    type="text"
                    id="transactionRef"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Enter UPI Reference ID or Transaction ID"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="verify-button"
                  disabled={verifying || !transactionRef.trim()}
                >
                  {verifying ? 'Verifying...' : 'Verify Payment'}
                </button>
              </form>
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
                onClick={async () => {
                  if (window.confirm('Are you sure you want to cancel your subscription?')) {
                    try {
                      const result = await SubscriptionService.cancelSubscription();
                      if (result.success) {
                        toast.success('Subscription cancelled successfully');
                        setSubscription({
                          ...subscription,
                          status: 'cancelled'
                        });
                      }
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
                    }
                  }
                }}
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
              <span className="currency">₹</span>
              <span className="amount">{formatIndianPrice(plan.price)}</span>
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
              className="subscribe-btn"
              onClick={() => handleSubscribe(plan)}
              disabled={processingPayment || (subscription?.status === 'active')}
            >
              {processingPayment ? 'Processing...' : 'Subscribe Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage; 