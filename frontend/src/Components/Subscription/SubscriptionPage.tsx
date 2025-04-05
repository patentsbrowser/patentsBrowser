import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as SubscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
// import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useAuth } from '../../AuthContext';

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

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

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
      await loadScript();
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
    if (!isAuthenticated) {
      navigate('/auth/signup?redirect=subscription');
      return;
    }

    try {
      setProcessingPayment(true);
      const orderResult = await SubscriptionService.createSubscriptionOrder(plan._id);
      
      if (!orderResult.success) {
        toast.error('Failed to create order');
        setProcessingPayment(false);
        return;
      }

      const { order, key, user: userData } = orderResult.data;

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'AllinoneSearch',
        description: `Subscribe to ${plan.name} Plan`,
        order_id: order.id,
        prefill: {
          name: userData.name,
          email: userData.email,
          contact: userData.contact
        },
        theme: {
          color: '#592e83'  // Royal violet
        },
        handler: async function (response: any) {
          try {
            const paymentData = {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              planId: plan._id
            };
            
            const activateResult = await SubscriptionService.activateSubscription(paymentData);
            
            if (activateResult.success) {
              toast.success('Subscription activated successfully!');
              setSubscription(activateResult.data);
              navigate('/dashboard');
            } else {
              toast.error('Failed to activate subscription');
            }
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Payment verification failed');
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function() {
            setProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process subscription');
      setProcessingPayment(false);
    }
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