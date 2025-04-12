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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
}

// UPI Payment Modal Component
const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan }) => {
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!isOpen) return null;
  
  // Generate UPI link for the plan
  const generateUpiLink = (amount: number, planName: string) => {
    // Replace with your actual UPI ID
    const upiId = "patentsbrowser@ybl";
    const merchantName = "PatentsBrowser";
    const planLabel = `${planName} Plan`;
    
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&tn=${encodeURIComponent(planLabel)}&am=${amount}&cu=INR`;
  };
  
  const upiLink = generateUpiLink(plan.price, plan.name);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionId.trim()) {
      toast.error('Please enter your UPI Transaction ID');
      return;
    }
    
    setIsSubmitting(true);
    
    // Here you would normally send this to your backend
    // For now we'll just simulate success
    setTimeout(() => {
      toast.success('Payment verification initiated! We will update your subscription shortly.');
      setIsSubmitting(false);
      onClose();
    }, 1500);
  };
  
  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2>Pay with UPI</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="payment-modal-body">
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
              />
            </div>
            <button 
              type="submit" 
              className="verify-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Verify Payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const SubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  // Use ref to track if data has been fetched to prevent duplicate calls
  const dataFetchedRef = useRef(false);

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

  if (loading) {
    return <div className="subscription-page loading">Loading subscription plans...</div>;
  }

  return (
    <div className="subscription-page">
      <div className="subscription-header">
        <h1>Subscription Plans</h1>
        <p>Choose the perfect plan for your patent search needs</p>
      </div>

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
              Subscribe Now
            </button>
          </div>
        ))}
      </div>
      
      {selectedPlan && (
        <PaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={closePaymentModal} 
          plan={selectedPlan}
        />
      )}
    </div>
  );
};

export default SubscriptionPage; 