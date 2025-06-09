import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import * as SubscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
import type { Plan } from '../../types/subscription';

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: Plan;
  newPlan: Plan;
  onPlanChangeComplete: () => void;
  isUpgrade: boolean;
  onSuccess?: () => Promise<void>;
}

const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  newPlan,
  onPlanChangeComplete,
  isUpgrade,
  onSuccess
}) => {
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'creating' | 'ready' | 'verifying' | 'pending' | 'complete'>('creating');
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<number | null>(null);
  const [submittedTransactionId, setSubmittedTransactionId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [proratedAmount, setProratedAmount] = useState<number | null>(null);
  const requestInProgressRef = useRef(false);

  // Generate UPI link for payment
  const generateUpiLink = (amount: number, planName: string) => {
    const upiId = import.meta.env.VITE_UPI_ID || 'your-upi-id@bank';
    const note = `Plan change to ${planName}`;
    return `upi://pay?pa=${upiId}&pn=PatentsBrowser&am=${amount}&tr=${Date.now()}&tn=${encodeURIComponent(note)}`;
  };

  // Handle plan change request
  useEffect(() => {
    if (!isOpen || requestInProgressRef.current) return;

    const initiatePlanChange = async () => {
      requestInProgressRef.current = true;
      try {
        setPaymentStep('creating');
        const response = await SubscriptionService.requestPlanChange(newPlan._id);
        setProratedAmount(response.data.proratedAmount);
        setPaymentStep('ready');
      } catch (error) {
        console.error('Error initiating plan change:', error);
        toast.error('Failed to initiate plan change. Please try again.');
        onClose();
      } finally {
        requestInProgressRef.current = false;
      }
    };

    initiatePlanChange();
  }, [isOpen, newPlan._id, onClose]);

  // Handle payment verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || isSubmitting) return;

    const validation = validateUPIReference(transactionId);
    if (!validation.isValid) {
      setValidationError(validation.message);
      return;
    }

    setIsSubmitting(true);
    setPaymentStep('verifying');

    try {
      // For upgrades, verify payment
      if (isUpgrade) {
        await SubscriptionService.verifyPlanChangePayment(
          newPlan._id,
          transactionId,
          '' // Add screenshot upload functionality if needed
        );
        setSubmittedTransactionId(transactionId);
        setPaymentStep('pending');

        // Start checking payment status
        const interval = setInterval(async () => {
          try {
            const status = await SubscriptionService.checkPaymentVerificationStatus(transactionId);
            if (status.data.status === 'verified') {
              clearInterval(interval);
              setStatusCheckInterval(null);
              setPaymentStep('complete');
              toast.success('Plan change completed successfully!');
              onPlanChangeComplete();
              onClose();
              if (onSuccess) {
                await onSuccess();
              }
            } else if (status.data.status === 'rejected') {
              clearInterval(interval);
              setStatusCheckInterval(null);
              setVerificationStatus('rejected');
              toast.error('Payment verification failed. Please try again.');
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        }, 5000);

        setStatusCheckInterval(interval);
      } else {
        // For downgrades, just show pending status
        setPaymentStep('pending');
        toast.success('Downgrade request submitted. It will be processed by our team.');
        onPlanChangeComplete();
        onClose();
      }
    } catch (error) {
      console.error('Error processing plan change:', error);
      toast.error('Failed to process plan change. Please try again.');
      setPaymentStep('ready');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (paymentStep) {
      case 'creating':
        return (
          <div className="payment-modal-content">
            <h3>Initializing Plan Change</h3>
            <p>Please wait while we prepare your plan change request...</p>
          </div>
        );

      case 'ready':
        return (
          <div className="payment-modal-content">
            <h3>{isUpgrade ? 'Upgrade Plan' : 'Downgrade Plan'}</h3>
            <div className="plan-change-details">
              <p>Current Plan: {currentPlan.name}</p>
              <p>New Plan: {newPlan.name}</p>
              {isUpgrade && proratedAmount && (
                <p>Prorated Amount: ₹{proratedAmount.toLocaleString('en-IN')}</p>
              )}
            </div>

            {isUpgrade ? (
              <>
                <div className="upi-payment-section">
                  <h4>Scan QR Code to Pay</h4>
                  <QRCodeSVG
                    value={generateUpiLink(proratedAmount || 0, newPlan.name)}
                    size={200}
                  />
                  <p className="upi-id">{import.meta.env.VITE_UPI_ID}</p>
                </div>

                <form onSubmit={handleSubmit} className="payment-form">
                  <div className="form-group">
                    <label>Enter UPI Transaction ID</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => {
                        setTransactionId(e.target.value);
                        setValidationError(null);
                      }}
                      placeholder="Enter UPI Transaction ID"
                      disabled={isSubmitting}
                    />
                    {validationError && (
                      <p className="error-message">{validationError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!transactionId || isSubmitting}
                    className="submit-button"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify Payment'}
                  </button>
                </form>
              </>
            ) : (
              <div className="downgrade-notice">
                <p>Your downgrade request will be processed by our team.</p>
                <p>You'll continue to have access to your current plan features until the downgrade is processed.</p>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="submit-button"
                >
                  Confirm Downgrade
                </button>
              </div>
            )}
          </div>
        );

      case 'verifying':
        return (
          <div className="payment-modal-content">
            <h3>Verifying Payment</h3>
            <p>Please wait while we verify your payment...</p>
          </div>
        );

      case 'pending':
        return (
          <div className="payment-modal-content">
            <h3>Payment Verification Pending</h3>
            <p>Your payment is being verified. This may take a few minutes.</p>
            <p>Transaction ID: {submittedTransactionId}</p>
          </div>
        );

      case 'complete':
        return (
          <div className="payment-modal-content">
            <h3>Plan Change Complete!</h3>
            <p>Your plan has been successfully changed.</p>
            <button onClick={onClose} className="close-button">
              Close
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        {renderContent()}
      </div>
    </div>
  );
};

export default PlanChangeModal; 