import React, { useState, useEffect, useRef } from 'react';
import subscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
// import './CurrentSubscription.scss';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import PlanChangeModal from './PlanChangeModal';
import type { Plan, Subscription, UserSubscription, SubscriptionStatus } from '../../types/subscription';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  onPaymentComplete: () => void;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isOrganizationPlan: boolean;
  onSuccess?: () => Promise<void>;
}
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
const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan, onPaymentComplete, isTrialActive, trialDaysRemaining, isOrganizationPlan }) => {
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
  const [trialDaysAddedMessage, setTrialDaysAddedMessage] = useState<string | null>(null);

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
      try {
        setPaymentStep('creating');
        await subscriptionService.subscribe(plan._id, { transactionId: upiOrderId });
        setPaymentStep('ready');
      } catch (error) {
        console.error('Error creating pending subscription:', error);
        toast.error('Failed to initialize payment. Please try again.');
        onClose();
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
      const result = await subscriptionService.verifyPayment({
        subscriptionId: plan._id,
        transactionId: trimmedId,
        amount: plan.price,
        status: 'pending'
      });
      
      if (result && 'status' in result) {
        setSubmittedTransactionId(trimmedId);
        setPaymentStep('pending');
        setVerificationStatus('Your payment reference has been submitted to the admin for verification. This usually takes 10-15 minutes. Until verification is complete, you can continue to use the free trial version.');
        
        const intervalId = window.setInterval(async () => {
          try {
            const statusResult = await subscriptionService.getPaymentStatus(plan._id);
            
            switch(statusResult.status) {
              case 'verified':
                clearInterval(intervalId);
                setStatusCheckInterval(null);
                setPaymentStep('complete');
                toast.success('Payment verified! Your subscription is now active.');
                setTimeout(() => {
                  if (onPaymentComplete) onPaymentComplete();
                  if (onClose) onClose();
                }, 2000);
                break;
              
              case 'rejected':
                clearInterval(intervalId);
                setStatusCheckInterval(null);
                setVerificationStatus(statusResult.message || 'Your payment was rejected. Please check your payment history for details.');
                toast.error(statusResult.message || 'Payment was rejected by admin. Please check payment history for details.');
                setIsSubmitting(false);
                setPaymentStep('ready');
                setTransactionId('');
                setTimeout(() => {
                  if (onPaymentComplete) onPaymentComplete();
                  if (onClose) onClose();
                }, 3000);
                break;
              
              case 'pending':
                // Continue polling
                break;
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        }, 20000);
        
        setStatusCheckInterval(intervalId);
      } else {
        toast.error('Payment verification failed. Please try again.');
        setIsSubmitting(false);
        setPaymentStep('ready');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
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
          {trialDaysAddedMessage && (
            <div className="trial-days-added">
              <p>{trialDaysAddedMessage}</p>
            </div>
          )}
        </div>
      );
    }

    if (paymentStep === 'pending') {
      return (
        <div className="payment-pending">
          <div className="pending-icon">⏳</div>
          <h3>Verification in Progress</h3>
          <p>{verificationStatus || 'Your payment reference has been submitted to the admin for verification. This usually takes 10-15 minutes.'}</p>
          
          {isTrialActive && trialDaysRemaining > 0 ? (
            <p className="free-trial-notice">
              You can continue to use your free trial until verification is complete. 
              Once verified, your {trialDaysRemaining} trial days will be added to your subscription.
            </p>
          ) : (
            <p className="free-trial-notice">
              You can use the free trial version until verification is complete.
            </p>
          )}
          
          <p className="pending-note">You can close this window. Your subscription will be activated automatically once verified.</p>
          
          <div className="payment-history-link">
            <Link to="/auth/payment-history" className="view-history-link">
              View Payment History
            </Link>
          </div>
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
  const [additionalPlans, setAdditionalPlans] = useState<Subscription[]>([]);
  const [loadingAdditionalPlans, setLoadingAdditionalPlans] = useState(false);
  const [totalDaysRemaining, setTotalDaysRemaining] = useState(0);

  useEffect(() => {
    const fetchAdditionalPlans = async () => {
      try {
        setLoadingAdditionalPlans(true);
        const result = await subscriptionService.getStackedPlans();
        if (result) {
          setAdditionalPlans(result);
        }
      } catch (error) {
        console.error('Error fetching additional plans:', error);
      } finally {
        setLoadingAdditionalPlans(false);
      }
    };

    if (subscription.status === 'active') {
      fetchAdditionalPlans();
    }
  }, [subscription._id, subscription.status]);

  // Calculate total days remaining across all plans
  useEffect(() => {
    if (subscription.status === 'active') {
      const mainPlanDays = calculateDaysLeft(subscription.endDate);
      const additionalDays = additionalPlans.reduce((total, plan) => {
        return total + calculateDaysLeft(plan.endDate);
      }, 0);
      setTotalDaysRemaining(mainPlanDays + additionalDays);
    } else if (subscription.status === 'trial') {
      setTotalDaysRemaining(calculateDaysLeft(subscription.endDate));
    }
  }, [subscription, additionalPlans]);

  // Check if there's a pending payment
  const isPendingPayment = subscription.isPendingPayment || subscription.status === 'payment_pending';

  return (
    <div className="subscription-status">
      <div className="status-header">
        <h2>Your Subscription</h2>
        <span className={`status-badge ${isPendingPayment ? 'pending' : subscription.status}`}>
          {isPendingPayment ? 'Payment Pending' :
           subscription.status === 'trial' ? 'Free Trial' :
           subscription.status === 'cancelled' ? 'Cancelled' :
           subscription.status === 'rejected' ? 'Payment Rejected' :
           subscription.status === 'inactive' ? 'Inactive' :
           subscription.status === 'paid' ? 'Paid' :
           subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
        </span>
      </div>
      
      <div className="subscription-details">
        {isPendingPayment ? (
          // Show pending payment status
          <div className="pending-payment-status">
            <div className="pending-icon">⏳</div>
            <div className="pending-message">
              <h3>Payment Verification in Progress</h3>
              <p>Your payment is being verified by our admin team.</p>
              <p>You can continue using your trial access until verification is complete.</p>
              <div className="trial-info">
                <p><strong>Trial Status:</strong></p>
                <div className="date-info">
                  {subscription.status !== 'trial' && (
                    <div className="date-item">
                      <span className="date-label">Started on:</span>
                      <span className="date-value">{formatDate(subscription.startDate)}</span>
                    </div>
                  )}
                  {(subscription.status === 'active' || subscription.status === 'paid') && (
                    <div className="date-item">
                      <span className="date-label">Expires:</span>
                      <span className="date-value">{formatDate(subscription.endDate)}</span>
                    </div>
                  )}
                </div>
                <div className="time-remaining">
                  <div className="days-left">{calculateDaysLeft(subscription.endDate)}</div>
                  <div className="days-label">trial days remaining</div>
                </div>
              </div>
            </div>
          </div>
        ) : subscription.status === 'rejected' ? (
          <div className="rejected-payment-status">
            <div className="rejected-icon">❌</div>
            <div className="rejected-message">
              <h3>Payment Rejected</h3>
              <p>Your payment was rejected by our admin team.</p>
              <p>Please try again or contact support for assistance.</p>
            </div>
          </div>
        ) : subscription.status === 'cancelled' ? (
          <div className="cancelled-subscription-status">
            <div className="cancelled-icon">⚠️</div>
            <div className="cancelled-message">
              <h3>Subscription Cancelled</h3>
              <p>Your subscription has been cancelled.</p>
              <p>You can subscribe again to regain access to premium features.</p>
            </div>
          </div>
        ) : subscription.status === 'inactive' ? (
          <div className="inactive-subscription-status">
            <div className="inactive-icon">⏸️</div>
            <div className="inactive-message">
              <h3>Subscription Inactive</h3>
              <p>Your subscription is currently inactive.</p>
              <p>Please contact support to reactivate your subscription.</p>
            </div>
          </div>
        ) : (
          // Show regular subscription details
          <>
            <div className="plan-name">
              <h3>{subscription.status === 'trial' ? 'Free Trial' : subscription.plan.name} Plan</h3>
              {subscription.status !== 'trial' && (
                <div className="plan-type">
                  {subscription.plan.type === 'monthly' ? 'Monthly' : 
                    subscription.plan.type === 'quarterly' ? 'Quarterly' : 
                    subscription.plan.type === 'half_yearly' ? 'Half Yearly' : 'Yearly'}
                </div>
              )}
            </div>
            
            <div className="date-info">
              {subscription.status !== 'trial' && (
                <div className="date-item">
                  <span className="date-label">Started on:</span>
                  <span className="date-value">{formatDate(subscription.startDate)}</span>
                </div>
              )}
              {(subscription.status === 'active' || subscription.status === 'paid') && (
                <div className="date-item">
                  <span className="date-label">Expires on:</span>
                  <span className="date-value">{formatDate(subscription.endDate)}</span>
                </div>
              )}
            </div>
            
            {(subscription.status === 'active' || subscription.status === 'paid') && (
              <div className="time-remaining">
                <div className="days-left">{totalDaysRemaining}</div>
                <div className="days-label">total days remaining</div>
              </div>
            )}
            
            {subscription.status === 'trial' && (
              <div className="trial-note">
                <p>Your free trial gives you full access to all premium features for 14 days.</p>
                <p>Subscribe to a paid plan to continue using premium features after your trial ends.</p>
              </div>
            )}

            {/* Additional Plans Section */}
            {subscription.status === 'active' && additionalPlans.length > 0 && (
              <div className="additional-plans">
                <h3>Additional Plans</h3>
                {loadingAdditionalPlans ? (
                  <div className="loading">Loading additional plans...</div>
                ) : (
                  <div className="additional-plans-list">
                    {additionalPlans.map((plan) => (
                      <div key={plan._id} className="additional-plan-card">
                        <h4>{plan.plan.name} Plan</h4>
                        <div className="plan-type">
                          {plan.plan.type === 'monthly' ? 'Monthly' : 
                            plan.plan.type === 'quarterly' ? 'Quarterly' : 
                            plan.plan.type === 'half_yearly' ? 'Half Yearly' : 'Yearly'}
                        </div>
                        <div className="date-info">
                          <div className="date-item">
                            <span className="date-label">Started:</span>
                            <span className="date-value">{formatDate(plan.startDate)}</span>
                          </div>
                          <div className="date-item">
                            <span className="date-label">Expires:</span>
                            <span className="date-value">{formatDate(plan.endDate)}</span>
                          </div>
                        </div>
                        <div className="time-remaining">
                          <div className="days-left">{calculateDaysLeft(plan.endDate)}</div>
                          <div className="days-label">days remaining</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};


const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planChangeState, setPlanChangeState] = useState<{
    isOpen: boolean;
    currentPlan: Plan | null;
    newPlan: Plan | null;
    isUpgrade: boolean;
  }>({
    isOpen: false,
    currentPlan: null,
    newPlan: null,
    isUpgrade: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching user-specific plans for user type:', user?.userType);

        // Check if user is organization member - they shouldn't see plans
        if (user?.userType === 'organization_member') {
          setPlans([]);
          setError('Organization members cannot view or purchase plans. Please contact your organization admin.');
          setLoading(false);
          return;
        }

        console.log('User type:', user?.userType);
        console.log('Fetching plans for user type:', user?.userType);

        const [plansData, subscriptionData] = await Promise.all([
          subscriptionService.getUserPlans(),
          subscriptionService.getUserSubscription()
        ]);

        console.log('Plans API Response:', plansData);
        console.log('User Subscription API Response:', subscriptionData);

        setPlans(plansData);
        setUserSubscription(subscriptionData);

        if (subscriptionData.subscription?.status === 'trial') {
          const daysRemaining = subscriptionData.subscription.trialDaysRemaining || 0;
          if (daysRemaining <= 3) {
            toast.warning(`Your trial period ends in ${daysRemaining} days. Consider upgrading to continue using premium features.`);
          }
        }
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('Failed to load subscription data');
        toast.error('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.userType]);

  const handleSubscribeClick = (plan: Plan) => {
    if (user?.userType === 'organization_member') {
      toast.info('Organization members cannot purchase plans. Please contact your organization admin.');
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePlanChangeClick = (plan: Plan) => {
    if (!userSubscription?.subscription) return;

    const currentPlan = userSubscription.subscription.plan;
    const isUpgrade = plan.price > currentPlan.price;

    if (user?.userType === 'organization_member') {
      toast.info('Organization members cannot change plans. Please contact your organization admin.');
      return;
    }

    setPlanChangeState({
      isOpen: true,
      currentPlan,
      newPlan: plan,
      isUpgrade
    });
  };

  const closePlanChangeModal = () => {
    setPlanChangeState({
      isOpen: false,
      currentPlan: null,
      newPlan: null,
      isUpgrade: false
    });
  };

  const handlePlanChangeComplete = async () => {
    try {
      const updatedSubscription = await subscriptionService.getUserSubscription();
      setUserSubscription(updatedSubscription);
      toast.success('Plan change completed successfully');
    } catch (err) {
      toast.error('Failed to update subscription status');
    }
    closePlanChangeModal();
  };

  const getPlanPrice = (plan: Plan) => {
    if (userSubscription?.isOrganization) {
      if (userSubscription.organizationRole === 'member') {
        return plan.memberPrice || plan.price;
      }
      return plan.organizationPrice || plan.price;
    }
    return plan.price;
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const statusConfig: Record<SubscriptionStatus, { color: string; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', text: 'Inactive' },
      payment_pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Payment Pending' },
      upgrade_pending: { color: 'bg-blue-100 text-blue-800', text: 'Upgrade Pending' },
      downgrade_pending: { color: 'bg-purple-100 text-purple-800', text: 'Downgrade Pending' },
      trial: { color: 'bg-indigo-100 text-indigo-800', text: 'Trial' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      paid: { color: 'bg-green-100 text-green-800', text: 'Paid' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const renderPlanCard = (plan: Plan) => {
    const isCurrentPlan = userSubscription?.subscription?.plan._id === plan._id;
    const canUpgrade = userSubscription?.subscription && 
      plan.price > userSubscription.subscription.plan.price;
    const canDowngrade = userSubscription?.subscription && 
      plan.price < userSubscription.subscription.plan.price;
    const price = getPlanPrice(plan);

    return (
      <div key={plan._id} className={`rounded-lg shadow-lg p-6 ${
        plan.popular ? 'border-2 border-blue-500' : 'border border-gray-200'
      }`}>
        {plan.popular && (
          <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-sm">
            Popular
          </div>
        )}
        <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
        <div className="mb-4">
          <span className="text-3xl font-bold">₹{price}</span>
          {plan.discountPercentage > 0 && (
            <span className="ml-2 text-sm text-gray-500 line-through">
              ₹{price * (1 + plan.discountPercentage / 100)}
            </span>
          )}
          <span className="text-sm text-gray-500">/{plan.type}</span>
        </div>
        <ul className="mb-6 space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
        {isCurrentPlan ? (
          <div className="text-center">
            <span className="text-green-600 font-medium">Current Plan</span>
            {userSubscription?.subscription.status === 'trial' && (
              <div className="mt-2 text-sm text-gray-600">
                Trial ends in {userSubscription.subscription.trialDaysRemaining} days
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              if (userSubscription?.subscription) {
                handlePlanChangeClick(plan);
              } else {
                handleSubscribeClick(plan);
              }
            }}
            className={`w-full py-2 px-4 rounded-md font-medium ${
              canUpgrade
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : canDowngrade
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {canUpgrade ? 'Upgrade' : canDowngrade ? 'Downgrade' : 'Subscribe'}
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Hide subscription page for organization members
  if (user?.userType === 'organization_member') {
    return (
      <div className="subscription-page">
        <div className="access-restriction-container">
          <div className="restriction-card">
            <div className="warning-icon">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3>Subscription Access Restricted</h3>
            <p>As an organization member, your subscription is managed by your organization admin.</p>
            <div className="member-info">
              <p>Your organization admin handles all subscription-related decisions.</p>
              <p>Contact your admin for any subscription queries or plan changes.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <div className="text-yellow-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Access Restricted</h3>
            <p className="text-yellow-700 mb-4">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {userSubscription?.subscription && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Current Subscription</h2>
            {getStatusBadge(userSubscription.subscription.status)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Plan: {userSubscription.subscription.planName}</p>
              <p className="text-gray-600">
                {userSubscription.isOrganization ? 'Organization' : 'Individual'} Account
              </p>
              {userSubscription.isOrganization && (
                <>
                  <p className="text-gray-600">Organization: {userSubscription.organizationName}</p>
                  <p className="text-gray-600">Role: {userSubscription.organizationRole}</p>
                </>
              )}
            </div>
            <div>
              <p className="text-gray-600">
                Start Date: {new Date(userSubscription.subscription.startDate).toLocaleDateString()}
              </p>
              <p className="text-gray-600">
                End Date: {new Date(userSubscription.subscription.endDate).toLocaleDateString()}
              </p>
              {userSubscription.subscription.trialDaysRemaining !== undefined && (
                <p className="text-gray-600">
                  Trial Days Remaining: {userSubscription.subscription.trialDaysRemaining}
                </p>
              )}
            </div>
          </div>
          {userSubscription.subscription.stackedPlans && userSubscription.subscription.stackedPlans.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Stacked Plans</h3>
              <div className="space-y-2">
                {userSubscription.subscription.stackedPlans.map((stackedPlan) => (
                  <div key={stackedPlan._id} className="p-2 bg-gray-50 rounded">
                    <p className="text-sm">{stackedPlan.planName}</p>
                    <p className="text-xs text-gray-500">
                      Valid until: {new Date(stackedPlan.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(renderPlanCard)}
      </div>

      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          plan={selectedPlan}
          onClose={() => setShowPaymentModal(false)}
          onPaymentComplete={handlePlanChangeComplete}
          isTrialActive={userSubscription?.subscription?.status === 'trial'}
          trialDaysRemaining={userSubscription?.subscription?.trialDaysRemaining || 0}
          isOrganizationPlan={userSubscription?.isOrganization || false}
          onSuccess={handlePlanChangeComplete}
        />
      )}

      {planChangeState.isOpen && planChangeState.currentPlan && planChangeState.newPlan && (
        <PlanChangeModal
          isOpen={planChangeState.isOpen}
          onPlanChangeComplete={handlePlanChangeComplete}
          currentPlan={planChangeState.currentPlan}
          newPlan={planChangeState.newPlan}
          isUpgrade={planChangeState.isUpgrade}
          onClose={closePlanChangeModal}
          onSuccess={handlePlanChangeComplete}
        />
      )}
    </div>
  );
};

export default SubscriptionPage; 