import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as SubscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';

const SubscriptionCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Process the payment callback when component mounts
    processPaymentCallback();
  }, []);

  const processPaymentCallback = async () => {
    try {
      setLoading(true);
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
          // Redirect to dashboard after successful payment
          navigate('/dashboard', { replace: true });
        } else {
          toast.error('Failed to activate subscription');
          navigate('/subscription', { replace: true });
        }
      } else if (status === 'failure') {
        toast.error('Payment failed. Please try again.');
        navigate('/subscription', { replace: true });
      } else {
        toast.error('Invalid payment response');
        navigate('/subscription', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error processing payment callback');
      navigate('/subscription', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscription-page loading">
      {loading ? 'Processing your payment...' : 'Redirecting...'}
    </div>
  );
};

export default SubscriptionCallback; 