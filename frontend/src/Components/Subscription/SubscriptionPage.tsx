import React, { useState, useEffect, useRef } from 'react';
import * as SubscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
import { toast } from 'react-toastify';
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
  status: 'active' | 'expired' | 'pending';
  plan: Plan;
  startDate: string;
  endDate: string;
  userId: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  onPaymentComplete: () => void;
}

// UPI Payment Modal Component
const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan, onPaymentComplete }) => {
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upiOrderId, setUpiOrderId] = useState('');
  const [paymentStep, setPaymentStep] = useState<'creating' | 'ready' | 'verifying' | 'complete'>('creating');
  const requestInProgressRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Generate a unique order ID only once when the modal opens
  useEffect(() => {
    if (isOpen && !hasInitializedRef.current) {
      const orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      setUpiOrderId(orderId);
      hasInitializedRef.current = true;
    }
    
    // Cleanup when modal closes
    if (!isOpen) {
      hasInitializedRef.current = false;
    }
  }, [isOpen]);
  
  // Create pending subscription in backend after we have an order ID
  useEffect(() => {
    if (!upiOrderId || requestInProgressRef.current) return;
    
    const createPendingSubscription = async () => {
      // Set flag to prevent duplicate requests
      requestInProgressRef.current = true;
      
      try {
        setPaymentStep('creating');
        console.log('Creating pending subscription with order ID:', upiOrderId);
        await SubscriptionService.createPendingSubscription(plan._id, upiOrderId);
        setPaymentStep('ready');
      } catch (error) {
        console.error('Error creating pending subscription:', error);
        toast.error('Failed to initialize payment. Please try again.');
        onClose();
      } finally {
        requestInProgressRef.current = false;
      }
    };
    
    createPendingSubscription();
    
    // Cleanup function
    return () => {
      requestInProgressRef.current = false;
    };
  }, [upiOrderId, plan._id, onClose]);
  
  if (!isOpen) return null;
  
  // Generate UPI link for the plan
  const generateUpiLink = (amount: number, planName: string, orderId: string) => {
    // Replace with your actual UPI ID
    const upiId = "patentsbrowser@ybl";
    const merchantName = "PatentsBrowser";
    const planLabel = `${planName}_${orderId}`;
    
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&tn=${encodeURIComponent(planLabel)}&am=${amount}&cu=INR`;
  };
  
  const upiLink = generateUpiLink(plan.price, plan.name, upiOrderId);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionId.trim()) {
      toast.error('Please enter your UPI Transaction ID');
      return;
    }
    
    setIsSubmitting(true);
    setPaymentStep('verifying');
    
    try {
      const result = await SubscriptionService.verifyUpiPayment(transactionId);
      
      if (result.success) {
        setPaymentStep('complete');
        toast.success('Payment verified! Your subscription is now active.');
        setTimeout(() => {
          onPaymentComplete(); // Call this to refresh subscription data
          onClose();
        }, 2000);
      } else {
        toast.error(result.message || 'Payment verification failed. Please try again.');
        setIsSubmitting(false);
        setPaymentStep('ready');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment. Please try again or contact support.');
      setIsSubmitting(false);
      setPaymentStep('ready');
    }
  };

  const renderContent = () => {
    if (paymentStep === 'creating') {
      return (
        <div className="creating-payment">
          <div className="spinner"></div>
          <p>Initializing payment...</p>
        </div>
      );
    }
    
    if (paymentStep === 'complete') {
      return (
        <div className="payment-success">
          <div className="success-icon">✓</div>
          <h3>Payment Successful!</h3>
          <p>Your subscription is now active.</p>
        </div>
      );
    }
    
    return (
      <>
        <div className="qr-code-container">
          <div className="qr-code-wrapper">
            <QRCodeSVG value={upiLink} size={180} />
          </div>
          <div className="payment-info">
            <h3>{plan.name} Plan</h3>
            <div className="amount">₹{plan.price.toLocaleString('en-IN')}</div>
            <div className="plan-name">
              {plan.type === 'monthly' ? 'Monthly' : 
                plan.type === 'quarterly' ? 'Quarterly' : 
                plan.type === 'half_yearly' ? 'Half Yearly' : 'Yearly'} Plan
            </div>
            <div className="order-id">Order ID: {upiOrderId}</div>
          </div>
        </div>
        
        <div className="payment-instructions">
          <h4>How to pay:</h4>
          <ol>
            <li>Open your UPI app (Google Pay, PhonePe, etc.)</li>
            <li>Scan the QR code above</li>
            <li>Complete the payment</li>
            <li>Enter the UPI Reference ID below</li>
          </ol>
        </div>
        
        <form className="transaction-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="transaction-id">UPI Transaction Reference ID</label>
            <input 
              id="transaction-id"
              type="text" 
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. 123456789012"
              required
              disabled={paymentStep === 'verifying'}
            />
          </div>
          <button 
            type="submit" 
            className="verify-button"
            disabled={isSubmitting || paymentStep === 'verifying'}
          >
            {paymentStep === 'verifying' ? 'Verifying...' : 'Verify Payment'}
          </button>
        </form>
      </>
    );
  };
  
  return (
    <div className="payment-modal-overlay" onClick={paymentStep !== 'verifying' ? onClose : undefined}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>Pay with UPI</h2>
          {paymentStep !== 'verifying' && (
            <button className="close-button" onClick={onClose}>&times;</button>
          )}
        </div>
        <div className="payment-modal-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Subscription Status Component
const SubscriptionStatus: React.FC<{ subscription: Subscription }> = ({ subscription }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const calculateDaysLeft = (endDateString: string) => {
    const endDate = new Date(endDateString);
    const today = new Date();
    
    // Clear time portion for accurate day calculation
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysLeft = calculateDaysLeft(subscription.endDate);

  return (
    <div className="subscription-status">
      <div className="status-header">
        <h2>Your Subscription</h2>
        <span className={`status-badge ${subscription.status}`}>
          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
        </span>
      </div>
      
      <div className="subscription-details">
        <div className="plan-name">
          <h3>{subscription.plan.name} Plan</h3>
          <div className="plan-type">
            {subscription.plan.type === 'monthly' ? 'Monthly' : 
              subscription.plan.type === 'quarterly' ? 'Quarterly' : 
              subscription.plan.type === 'half_yearly' ? 'Half Yearly' : 'Yearly'} Plan
          </div>
        </div>
        
        <div className="date-info">
          <div className="date-item">
            <span className="date-label">Started on:</span>
            <span className="date-value">{formatDate(subscription.startDate)}</span>
          </div>
          <div className="date-item">
            <span className="date-label">Expires on:</span>
            <span className="date-value">{formatDate(subscription.endDate)}</span>
          </div>
        </div>
        
        {subscription.status === 'active' && (
          <div className="time-remaining">
            <div className="days-left">{daysLeft}</div>
            <div className="days-label">days remaining</div>
          </div>
        )}
      </div>
    </div>
  );
};

const SubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  
  // Use ref to track if data has been fetched to prevent duplicate calls
  const dataFetchedRef = useRef(false);

  const fetchUserSubscription = async () => {
    try {
      setIsLoadingSubscription(true);
      const result = await SubscriptionService.getUserSubscription();
      
      if (result.success && result.data) {
        console.log('Fetched user subscription:', result.data);
        setUserSubscription(result.data);
      } else {
        console.log('No active subscription found');
        setUserSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      setUserSubscription(null);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  useEffect(() => {
    fetchUserSubscription();
    
    // Set up interval to check subscription status (every 5 minutes)
    const intervalId = setInterval(() => {
      console.log('Checking subscription status...');
      fetchUserSubscription();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Only fetch if we haven't already done so
    if (dataFetchedRef.current) {
      console.log("Plans already fetched, skipping API call");
      return;
    }

    const fetchPlans = async () => {
      try {
        console.log("Fetching subscription plans...");
        const result = await SubscriptionService.getSubscriptionPlans();
        
        if (result.success) {
          console.log(`Successfully fetched ${result.data.length} plans`);
          setPlans(result.data);
        } else {
          console.error('Failed to load plans:', result.message);
        }
      } catch (error) {
        toast.error('Failed to load subscription plans');
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
        // Mark that we've fetched the data
        dataFetchedRef.current = true;
      }
    };

    fetchPlans();
    
    // Cleanup function
    return () => {
      console.log("SubscriptionPage unmounting");
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const formatIndianPrice = (price: number): string => {
    return price.toLocaleString('en-IN');
  };
  
  const handleSubscribeClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };
  
  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPlan(null);
  };

  const handlePaymentComplete = () => {
    // Refetch subscription data after payment is complete
    fetchUserSubscription();
  };

  if (loading) {
    return <div className="subscription-page loading">Loading subscription plans...</div>;
  }

  return (
    <div className="subscription-page">
      <div className="subscription-header">
        <h1>Subscription Plans</h1>
        <p>Choose the perfect plan for your patent search needs</p>
      </div>

      {isLoadingSubscription ? (
        <div className="loading-subscription">Loading your subscription details...</div>
      ) : userSubscription && userSubscription.status === 'active' ? (
        <SubscriptionStatus subscription={userSubscription} />
      ) : (
        <div className="no-subscription-message">
          {userSubscription && userSubscription.status === 'expired' ? 
            "Your subscription has expired. Please renew to continue using premium features." : 
            "You don't have an active subscription. Subscribe now to access premium features."}
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
              onClick={() => handleSubscribeClick(plan)}
            >
              {userSubscription && userSubscription.status === 'active' ? 'Upgrade' : 'Subscribe Now'}
            </button>
          </div>
        ))}
      </div>
      
      {selectedPlan && (
        <PaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={closePaymentModal} 
          plan={selectedPlan}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
};

export default SubscriptionPage; 