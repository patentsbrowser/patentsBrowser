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
  status: 'active' | 'expired' | 'pending' | 'trial';
  plan: Plan;
  startDate: string;
  endDate: string;
  userId: string;
  trialEndsAt?: string;
  trialDaysRemaining?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  onPaymentComplete: () => void;
  isTrialActive: boolean;
  trialDaysRemaining: number;
}

// UPI Reference validation function
export function validateUPIReference(refNumber: string) {
  // Trim and normalize the input
  const ref = refNumber.trim();

  // Case 1: Only digits, 12 to 18 length (most common)
  const digitOnlyPattern = /^\d{12,18}$/;

  // Case 2: Optional bank code prefix (e.g., HDFC, ICICI), followed by digits
  const alphaNumericPattern = /^[A-Z]{3,6}\d{9,15}$/;

  // Case 3: Some UPI IDs include `@` like '324123456789@icici'
  const upiStylePattern = /^\d{6,18}@\w{3,10}$/;

  if (
    digitOnlyPattern.test(ref) ||
    alphaNumericPattern.test(ref) ||
    upiStylePattern.test(ref)
  ) {
    return {
      isValid: true,
      message: "Valid UPI Reference/UTR Number.",
    };
  }

  return {
    isValid: false,
    message: "Invalid UPI Reference/UTR format.",
  };
}

// UPI Payment Modal Component
const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan, onPaymentComplete, isTrialActive, trialDaysRemaining }) => {
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upiOrderId, setUpiOrderId] = useState('');
  const [paymentStep, setPaymentStep] = useState<'creating' | 'ready' | 'verifying' | 'pending' | 'complete'>('creating');
  const requestInProgressRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<number | null>(null);
  const [submittedTransactionId, setSubmittedTransactionId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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
      // Clear any status check intervals
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }
      // Clear submitted transaction ID
      setSubmittedTransactionId(null);
    }

    // Cleanup function to clear interval when component unmounts
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [isOpen, statusCheckInterval]);

  // Handle authentication state changes
  useEffect(() => {
    // Check if user is still logged in periodically
    const checkAuthInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token && statusCheckInterval) {
        // If token is gone (user logged out) but interval is still running, clear it
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(checkAuthInterval);
    };
  }, [statusCheckInterval]);
  
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
    
    const trimmedId = transactionId.trim();
    if (!trimmedId) {
      toast.error('Please enter your UPI Transaction ID');
      return;
    }

    // Validate the transaction ID using our regex patterns
    const validation = validateUPIReference(trimmedId);
    if (!validation.isValid) {
      setValidationError(validation.message);
      toast.error(validation.message);
      return;
    }
    
    setIsSubmitting(true);
    setPaymentStep('verifying');
    
    try {
      const result = await SubscriptionService.verifyUpiPayment(trimmedId);
      
      if (result.success) {
        // Store the transaction ID for status checks
        setSubmittedTransactionId(trimmedId);
        
        // All payments now require admin verification
        setPaymentStep('pending');
        setVerificationStatus('Your payment reference has been submitted to the admin for verification. This usually takes 10-15 minutes. Until verification is complete, you can continue to use the free trial version.');
        
        // Start polling for status updates
        const intervalId = window.setInterval(async () => {
          // Check if user is still logged in
          const token = localStorage.getItem('token');
          if (!token) {
            clearInterval(intervalId);
            setStatusCheckInterval(null);
            return;
          }

          // Check if transaction ID is still available
          if (!submittedTransactionId) {
            clearInterval(intervalId);
            setStatusCheckInterval(null);
            return;
          }

          try {
            const statusResult = await SubscriptionService.checkPaymentVerificationStatus(submittedTransactionId);
            
            if (statusResult.success) {
              if (statusResult.data.status === 'active') {
                // Payment has been verified by admin
                clearInterval(intervalId);
                setStatusCheckInterval(null);
                setPaymentStep('complete');
                toast.success('Payment verified! Your subscription is now active.');
                setTimeout(() => {
                  if (onPaymentComplete) {
                    onPaymentComplete();
                  }
                  if (onClose) {
                    onClose();
                  }
                }, 2000);
              } else if (statusResult.data.status === 'rejected') {
                // Payment has been rejected by admin
                clearInterval(intervalId);
                setStatusCheckInterval(null);
                setVerificationStatus('Your payment was rejected. Please contact support for assistance.');
                toast.error('Payment verification failed. Please contact support.');
                setIsSubmitting(false);
                setPaymentStep('ready');
              }
              // Otherwise keep polling (pending/unverified)
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
            // Don't stop polling on error, just log it
          }
        }, 20000); // Check every 20 seconds
        
        setStatusCheckInterval(intervalId);
      } else {
        toast.error(result.message || 'Payment verification failed. Please try again.');
        setIsSubmitting(false);
        setPaymentStep('ready');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      
      // Display the specific error message from the backend if available
      const errorMessage = error.response?.data?.message || 
                         'Failed to verify payment. Please try again or contact support.';
      
      toast.error(errorMessage);
      setIsSubmitting(false);
      setPaymentStep('ready');
    }
  };

  // Add a function to handle input change with validation
  const handleTransactionIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTransactionId(value);
    
    // Clear validation error when user starts typing again
    if (validationError) {
      setValidationError(null);
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

    if (paymentStep === 'pending') {
      return (
        <div className="payment-pending">
          <div className="pending-icon">⏳</div>
          <h3>Verification in Progress</h3>
          <p>{verificationStatus || 'Your payment reference has been submitted to the admin for verification. This usually takes 10-15 minutes.'}</p>
          
          {isTrialActive ? (
            <p className="free-trial-notice">
              You can continue to use your free trial until verification is complete. 
              Once verified, your trial days will be added to your subscription.
            </p>
          ) : (
            <p className="free-trial-notice">
              You can use the free trial version until verification is complete.
            </p>
          )}
          
          <p className="pending-note">You can close this window. Your subscription will be activated automatically once verified.</p>
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
              onChange={handleTransactionIdChange}
              placeholder="e.g. 123456789012"
              required
              disabled={paymentStep === 'verifying'}
              className={validationError ? "error" : ""}
            />
            {validationError && (
              <div className="validation-error">{validationError}</div>
            )}
            <div className="input-hint">
              Enter the UTR or reference number from your UPI payment app (12-18 digits)
            </div>
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
          {isTrialActive && trialDaysRemaining > 0 && (
            <div className="trial-carryover-notice">
              <h3>Good news! Trial days will be added</h3>
              <p>You have <strong>{trialDaysRemaining} days</strong> remaining in your free trial. 
                 These days will be added to your {plan.type === 'monthly' ? 'month' : 
                   plan.type === 'quarterly' ? '3 months' : 
                   plan.type === 'half_yearly' ? '6 months' : 'year'} subscription, giving you a total of
                 <strong> {trialDaysRemaining + (
                   plan.type === 'monthly' ? 30 : 
                   plan.type === 'quarterly' ? 90 : 
                   plan.type === 'half_yearly' ? 180 : 365
                 )} days</strong> of access!</p>
            </div>
          )}
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
          {subscription.status === 'trial' ? 'Free Trial' : 
           subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
        </span>
      </div>
      
      <div className="subscription-details">
        <div className="plan-name">
          <h3>{subscription.status === 'trial' ? 'Free Trial' : subscription.plan.name} Plan</h3>
          {subscription.status !== 'trial' && (
            <div className="plan-type">
              {subscription.plan.type === 'monthly' ? 'Monthly' : 
                subscription.plan.type === 'quarterly' ? 'Quarterly' : 
                subscription.plan.type === 'half_yearly' ? 'Half Yearly' : 'Yearly'} Plan
            </div>
          )}
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
        
        {(subscription.status === 'active' || subscription.status === 'trial') && (
          <div className="time-remaining">
            <div className="days-left">{daysLeft}</div>
            <div className="days-label">days remaining</div>
          </div>
        )}
        
        {subscription.status === 'trial' && (
          <div className="trial-note">
            <p>Your free trial gives you full access to all premium features for 14 days.</p>
            <p>Subscribe to a paid plan to continue using premium features after your trial ends.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Free Trial Section Component - updated to show automatically activated trial
const FreeTrialSection: React.FC<{ isTrialActive: boolean, trialDaysRemaining: number }> = ({ isTrialActive, trialDaysRemaining }) => {
  return (
    <div className="free-trial-card">
      {isTrialActive ? (
        <>
          <h2>Your 14-Day Free Trial is Active!</h2>
          <p>You have <strong>{trialDaysRemaining} days</strong> remaining in your free trial period.</p>
          
          <div className="trial-features">
            <h3>Your trial includes:</h3>
            <ul>
              <li>Full access to premium search features</li>
              <li>Unlimited searches during trial period</li>
              <li>Access to all patent databases</li>
              <li>Export and save search results</li>
            </ul>
          </div>
          
          <div className="trial-active-message">
            <p>Subscribe to a paid plan below to keep your access. Any remaining trial days will be added to your subscription!</p>
          </div>
        </>
      ) : (
        <>
          <h2>Get Premium Access</h2>
          <p>New accounts automatically receive a 14-day free trial with full access to premium features.</p>
          
          <ul className="trial-features">
            <li>Full access to premium search features</li>
            <li>Unlimited searches during trial period</li>
            <li>Access to all patent databases</li>
            <li>Export and save search results</li>
          </ul>
          
          <div className="trial-upgrade-message">
            <p>Subscribe now to get access to premium features.</p>
          </div>
        </>
      )}
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
  const [isTrialActive, setIsTrialActive] = useState(false);
  
  // Use ref to track if data has been fetched to prevent duplicate calls
  const dataFetchedRef = useRef(false);

  const fetchUserSubscription = async () => {
    try {
      setIsLoadingSubscription(true);
      const result = await SubscriptionService.getUserSubscription();
      
      if (result.success && result.data) {
        console.log('Fetched user subscription:', result.data);
        setUserSubscription(result.data);
        // A user has an active trial if they're in trial status OR they have trialDaysRemaining
        setIsTrialActive(
          result.data.status === 'trial' || 
          (result.data.trialDaysRemaining !== undefined && result.data.trialDaysRemaining > 0)
        );
      } else {
        console.log('No active subscription found');
        // For new users, we should set trial as active by default
        setUserSubscription(null);
        // Default to trial active for new users
        setIsTrialActive(true);
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      setUserSubscription(null);
      // Default to trial active for new users
      setIsTrialActive(true);
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
      ) : userSubscription ? (
        userSubscription.status === 'trial' || userSubscription.status === 'active' ? (
          <SubscriptionStatus subscription={userSubscription} />
        ) : (
          // Show expired/pending subscription message and free trial section if applicable
          <>
            <div className="no-subscription-message">
              {userSubscription.status === 'expired' ? 
                "Your subscription has expired. Subscribe now to regain access to premium features." : 
                "Your subscription is pending approval."}
            </div>
            <FreeTrialSection 
              isTrialActive={false}
              trialDaysRemaining={0} 
            />
          </>
        )
      ) : (
        // No subscription at all - but new users should have an active trial
        <>
          <div className="no-subscription-message">
            {isTrialActive ? 
              "You're currently on a free trial. Subscribe to maintain access after your trial ends." : 
              "You don't have an active subscription. Subscribe now to access premium features."}
          </div>
          <FreeTrialSection 
            isTrialActive={isTrialActive} 
            trialDaysRemaining={14} /* Default for new users */
          />
        </>
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
              {userSubscription?.status === 'trial' ? 'Upgrade Now' :
                userSubscription?.status === 'active' ? 'Change Plan' : 'Subscribe Now'}
            </button>
            {isTrialActive && (
              <div className="trial-upgrade-note">
                {userSubscription?.trialDaysRemaining} trial days will be added to your subscription
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedPlan && (
        <PaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={closePaymentModal} 
          plan={selectedPlan}
          onPaymentComplete={handlePaymentComplete}
          isTrialActive={isTrialActive}
          trialDaysRemaining={userSubscription?.trialDaysRemaining || 0}
        />
      )}
    </div>
  );
};

export default SubscriptionPage; 