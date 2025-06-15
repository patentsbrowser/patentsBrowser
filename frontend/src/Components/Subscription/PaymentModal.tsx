import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as SubscriptionService from '../../services/SubscriptionService';
import './PaymentModal.scss';

interface Plan {
  _id: string;
  name: string;
  type: string;
  price: number;
}

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

// UPI Reference validation function
export function validateUPIReference(refNumber: string) {
  const ref = refNumber.trim();
  const digitOnlyPattern = /^\d{12,18}$/;
  const alphaNumericPattern = /^[A-Z]{3,6}\d{9,15}$/;
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

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  plan, 
  onPaymentComplete, 
  isTrialActive, 
  trialDaysRemaining, 
  isOrganizationPlan,
  onSuccess
}) => {
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upiOrderId, setUpiOrderId] = useState('');
  const [paymentStep, setPaymentStep] = useState<'creating' | 'ready' | 'verifying' | 'pending' | 'complete'>('creating');
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<number | null>(null);
  const [submittedTransactionId, setSubmittedTransactionId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const requestInProgressRef = useRef(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasInitializedRef.current) {
      const orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      setUpiOrderId(orderId);
      hasInitializedRef.current = true;
    }
    
    if (!isOpen) {
      hasInitializedRef.current = false;
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }
      setSubmittedTransactionId(null);
    }

    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [isOpen, statusCheckInterval]);

  useEffect(() => {
    if (!upiOrderId || requestInProgressRef.current) return;
    
    const createPendingSubscription = async () => {
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
    
    return () => {
      requestInProgressRef.current = false;
    };
  }, [upiOrderId, plan._id, onClose]);
  
  console.log('PaymentModal render:', { isOpen, planName: plan?.name, paymentStep });

  if (!isOpen) return null;
  
  const generateUpiLink = (amount: number, planName: string, orderId: string) => {
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
        setSubmittedTransactionId(trimmedId);
        setPaymentStep('pending');
        setVerificationStatus('Your payment reference has been submitted for verification. This usually takes 10-15 minutes.');
        
        const intervalId = window.setInterval(async () => {
          const token = localStorage.getItem('token');
          if (!token || !submittedTransactionId) {
            clearInterval(intervalId);
            setStatusCheckInterval(null);
            return;
          }

          try {
            const statusResult = await SubscriptionService.checkPaymentVerificationStatus(submittedTransactionId);
            
            if (statusResult.success) {
              switch(statusResult.data.status) {
                case 'active':
                  clearInterval(intervalId);
                  setStatusCheckInterval(null);
                  setPaymentStep('complete');
                  toast.success('Payment verified! Your subscription is now active.');
                  setTimeout(() => {
                    onPaymentComplete();
                    onClose();
                  }, 2000);
                  break;
                
                case 'rejected':
                  clearInterval(intervalId);
                  setStatusCheckInterval(null);
                  setVerificationStatus('Your payment was rejected. Please check your payment history for details.');
                  toast.error('Payment was rejected. Please check payment history for details.');
                  setIsSubmitting(false);
                  setPaymentStep('ready');
                  setTransactionId('');
                  setTimeout(() => {
                    onPaymentComplete();
                    onClose();
                  }, 3000);
                  break;
                
                case 'cancelled':
                case 'inactive':
                  clearInterval(intervalId);
                  setStatusCheckInterval(null);
                  setVerificationStatus('Payment verification failed. Please try again or contact support.');
                  toast.error('Payment verification failed. Please try again or contact support.');
                  setIsSubmitting(false);
                  setPaymentStep('ready');
                  setTransactionId('');
                  break;
              }
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        }, 20000);
        
        setStatusCheckInterval(intervalId);
      } else {
        toast.error(result.message || 'Payment verification failed. Please try again.');
        setIsSubmitting(false);
        setPaymentStep('ready');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to verify payment. Please try again or contact support.';
      toast.error(errorMessage);
      setIsSubmitting(false);
      setPaymentStep('ready');
    }
  };

  const handleTransactionIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransactionId(e.target.value);
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
          <p>{verificationStatus}</p>
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
                 These days will be added to your subscription, giving you extra value!</p>
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal; 