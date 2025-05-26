import React, { useState, useEffect, useRef } from 'react';
import * as SubscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
// import './CurrentSubscription.scss';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';

interface Plan {
  _id: string;
  name: string;
  type: string;
  price: number;
  discountPercentage: number;
  features: string[];
  popular: boolean;
  isOrganizationPlan?: boolean;
  organizationPrice?: number;
  memberPrice?: number;
}

interface Subscription {
  _id: string;
  plan: Plan;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  isPendingPayment: boolean;
  trialDaysRemaining?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  onPaymentComplete: () => void;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isOrganizationPlan: boolean;
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

const formatIndianPrice = (price: number): string => {
  return price.toLocaleString('en-IN');
};

const getPlanTypeDisplay = (planType: string) => {
  switch (planType) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'half_yearly':
      return 'Half Yearly';
    case 'yearly':
      return 'Yearly';
    default:
      return planType;
  }
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
      // Set flag to prevent duplicate requests
      requestInProgressRef.current = true;
      
      try {
        setPaymentStep('creating');
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
              switch(statusResult.data.status) {
                case 'active':
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
                  setTrialDaysAddedMessage(`${trialDaysRemaining} trial days will be added to your subscription`);
                  break;
                
                case 'rejected':
                  // Payment has been rejected by admin
                  clearInterval(intervalId);
                  setStatusCheckInterval(null);
                  setVerificationStatus('Your payment was rejected. Please check your payment history for details.');
                  toast.error('Payment was rejected by admin. Please check payment history for details.');
                  setIsSubmitting(false);
                  setPaymentStep('ready');
                  // Reset the form
                  setTransactionId('');
                  // Close modal after a delay
                  setTimeout(() => {
                    if (onPaymentComplete) {
                      onPaymentComplete();
                    }
                    if (onClose) {
                      onClose();
                    }
                  }, 3000);
                  break;
                
                case 'cancelled':
                  // Payment has been cancelled
                  clearInterval(intervalId);
                  setStatusCheckInterval(null);
                  setVerificationStatus('Your payment was cancelled. Please try again or contact support.');
                  toast.error('Payment was cancelled. Please try again or contact support.');
                  setIsSubmitting(false);
                  setPaymentStep('ready');
                  setTransactionId('');
                  break;
                
                case 'inactive':
                  // Payment is inactive
                  clearInterval(intervalId);
                  setStatusCheckInterval(null);
                  setVerificationStatus('Your payment is inactive. Please contact support for assistance.');
                  toast.error('Payment is inactive. Please contact support for assistance.');
                  setIsSubmitting(false);
                  setPaymentStep('ready');
                  setTransactionId('');
                  break;
                
                case 'payment_pending':
                  // Continue polling
                  break;
                
                default:
                  // Handle unknown status
                  console.warn('Unknown payment status:', statusResult.data.status);
                  break;
              }
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
        const result: any = await SubscriptionService.getAdditionalPlans(subscription._id);
        if (result.success) {
          setAdditionalPlans(result.data);
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

// Free Trial Section Component - updated to show automatically activated trial
const FreeTrialSection: React.FC<{ isTrialActive: boolean, trialDaysRemaining: number }> = ({ isTrialActive, trialDaysRemaining }) => {
  return (
    <div className="free-trial-card">
      {isTrialActive ? (
        <>
          <h2>Your 14-Day Free Trial is Active!</h2>
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
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [stackedPlans, setStackedPlans] = useState<Subscription[]>([]);
  const [totalBenefits, setTotalBenefits] = useState<any>(null);
  const [showOrganizationPlans, setShowOrganizationPlans] = useState(false);
  
  // Use ref to track if data has been fetched to prevent duplicate calls
  const dataFetchedRef = useRef(false);

  const fetchUserSubscription = async () => {
    try {
      setIsLoadingSubscription(true);
      const result = await SubscriptionService.getUserSubscription();
      
      if (result.success) {
        setUserSubscription(result.data);
        setIsTrialActive(result.data?.status === 'trial');
        setHasPendingPayment(result.data?.isPendingPayment || false);
        
        if (result.data?.status === 'trial' && result.data?.trialDaysRemaining) {
          setTrialDaysRemaining(result.data.trialDaysRemaining);
        }
        
        // Fetch stacked plans if user has an active subscription
        if (result.data?.status === 'active') {
          const stackedResult = await SubscriptionService.getStackedPlans();
          if (stackedResult.success) {
            setStackedPlans(stackedResult.data);
          }
          
          // Fetch total benefits
          const benefitsResult = await SubscriptionService.getTotalSubscriptionBenefits();
          if (benefitsResult.success) {
            setTotalBenefits(benefitsResult.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      toast.error('Failed to load subscription details');
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  useEffect(() => {
    fetchUserSubscription();
    
    // Set up interval to check subscription status (every 5 minutes)
    const intervalId = setInterval(() => {
      fetchUserSubscription();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Only fetch if we haven't already done so
    if (dataFetchedRef.current) {
      return;
    }

    const fetchPlans = async () => {
      try {
        const result = await SubscriptionService.getSubscriptionPlans();
        
        if (result.success) {
          // Transform the plans to include organization pricing
          const transformedPlans = result.data.map((plan: Plan) => ({
            ...plan,
            organizationPrice: plan.price * 2, // Double the price for organization admin
            memberPrice: 1000, // ₹1000 per member per month
            isOrganizationPlan: true // Mark all plans as available for organization
          }));
          setPlans(transformedPlans);
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
  }, []);

  const handleSubscribeClick = (plan: Plan) => {
    // Don't allow new subscription if there's a pending payment
    if (hasPendingPayment) {
      toast.error('You have a pending payment. Please wait for verification or check payment history.');
      return;
    }
    
    // Simply open payment modal for both new subscriptions and stacking
    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };
  
  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPlan(null);
  };

  const handlePaymentComplete = () => {
    // Refetch subscription data after payment completion or rejection
    fetchUserSubscription();
  };

  if (loading) {
    return <div className="subscription-page loading">Loading subscription plans...</div>;
  }

  return (
    <div className="subscription-page-wrapper">
      <div className="subscription-page">
        <div className="subscription-header">
          <h1>Subscription Plans</h1>
          <p>Choose the perfect plan for your patent search needs</p>
          
          <div className="plan-type-toggle">
            <button
              className={`toggle-btn ${!showOrganizationPlans ? 'active' : ''}`}
              onClick={() => setShowOrganizationPlans(false)}
            >
              Individual Plans
            </button>
            <button
              className={`toggle-btn ${showOrganizationPlans ? 'active' : ''}`}
              onClick={() => setShowOrganizationPlans(true)}
            >
              Organization Plans
            </button>
          </div>
        </div>

        {isLoadingSubscription ? (
          <div className="loading-subscription">Loading your subscription details...</div>
        ) : (
          <>
            {userSubscription && userSubscription.status !== 'trial' && (
              <div className="current-subscription-container">
                <div className="subscription-box">
                  <div className="section current-plan">
                    <h2>Current Subscription</h2>
                    <div className="subscription-details">
                      <div className="plan-name">
                        <h3>{userSubscription.planName}</h3>
                        <div className="plan-type">
                          {getPlanTypeDisplay(userSubscription.plan.type)}
                        </div>
                      </div>
                      <div className="date-info">
                        <div className="date-item">
                          <span className="date-label">Started:</span>
                          <span className="date-value">{formatDate(userSubscription.startDate)}</span>
                        </div>
                        <div className="date-item">
                          <span className="date-label">Expires:</span>
                          <span className="date-value">{formatDate(userSubscription.endDate)}</span>
                        </div>
                      </div>
                      <div className="time-remaining">
                        <div className="days-left">{calculateDaysLeft(userSubscription.endDate)}</div>
                        <div className="days-label">days remaining</div>
                      </div>
                    </div>
                  </div>

                  <div className="section stacked-plans">
                    {stackedPlans.length > 0 && (
                      <div className="stacked-plans">
                        <h3>Stacked Plans</h3>
                        <div className="stacked-plans-list">
                          {stackedPlans.map((plan) => (
                            <div key={plan._id} className="stacked-plan-card">
                              <h4>{plan.plan.name} Plan</h4>
                              <div className="plan-type">
                                {getPlanTypeDisplay(plan.plan.type)}
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
                      </div>
                    )}
                  </div>

                  <div className="section total-benefits">
                    {totalBenefits && (
                      <div className="total-benefits">
                        <h3>Total Benefits</h3>
                        <div className="benefits-details">
                          <div className="benefit-item">
                            <span className="benefit-label">Total Amount:</span>
                            <span className="benefit-value">₹{formatIndianPrice(totalBenefits.totalAmount)}</span>
                          </div>
                          <div className="benefit-item">
                            <span className="benefit-label">Total Days:</span>
                            <span className="benefit-value">{totalBenefits.totalDays} days</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show free trial section if user is on trial or has no subscription */}
            {(!userSubscription || userSubscription.status === 'trial') && (
              <FreeTrialSection 
                isTrialActive={isTrialActive} 
                trialDaysRemaining={trialDaysRemaining} 
              />
            )}

            {/* Show pending payment banner if applicable */}
            {hasPendingPayment && (
              <div className="pending-payment-banner">
                <p>You have a pending payment. Your subscription will be activated once the admin verifies your payment.</p>
                <p>You can continue using the trial version until then.</p>
              </div>
            )}

            <div className="subscription-plans">
              {plans
                .filter(plan => showOrganizationPlans ? plan.isOrganizationPlan : !plan.isOrganizationPlan)
                .map((plan) => (
                <div 
                  key={plan._id} 
                  className={`plan-card ${plan.popular ? 'popular' : ''}`}
                >
                  {plan.popular && <div className="popular-badge">Most Popular</div>}
                  <h3>{plan.name}</h3>
                  <div className="price">
                    <span className="currency">₹</span>
                    <span className="amount">
                      {showOrganizationPlans ? formatIndianPrice(plan.organizationPrice || plan.price * 2) : formatIndianPrice(plan.price)}
                    </span>
                    <span className="period">/{getPlanTypeDisplay(plan.type)}</span>
                  </div>
                  {showOrganizationPlans && (
                    <div className="member-price">
                      <span>+ ₹{formatIndianPrice(plan.memberPrice || 1000)} per member/month</span>
                    </div>
                  )}
                  {plan.discountPercentage > 0 && (
                    <div className="discount">{plan.discountPercentage}% discount</div>
                  )}
                  <ul className="features">
                    {plan.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                    {showOrganizationPlans && (
                      <>
                        <li>Organization-wide access</li>
                        <li>Member management dashboard</li>
                        <li>Invite system for team members</li>
                        <li>Usage analytics and reporting</li>
                      </>
                    )}
                  </ul>
                  <button 
                    className="subscribe-btn"
                    onClick={() => handleSubscribeClick(plan)}
                    disabled={hasPendingPayment}
                  >
                    {hasPendingPayment ? 'Payment Pending' :
                      userSubscription?.status === 'trial' ? 'Upgrade Now' :
                      userSubscription?.status === 'active' ? 'Add Plan' : 'Subscribe Now'}
                  </button>
                  {isTrialActive && !hasPendingPayment && trialDaysRemaining > 0 && (
                    <div className="trial-upgrade-note">
                      {trialDaysRemaining} trial days will be added to your subscription
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        
        {selectedPlan && (
          <PaymentModal 
            isOpen={isPaymentModalOpen} 
            onClose={closePaymentModal} 
            plan={selectedPlan}
            onPaymentComplete={handlePaymentComplete}
            isTrialActive={isTrialActive}
            trialDaysRemaining={trialDaysRemaining}
            isOrganizationPlan={showOrganizationPlans}
          />
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage; 