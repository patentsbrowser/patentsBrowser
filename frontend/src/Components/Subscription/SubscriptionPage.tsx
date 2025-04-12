import React, { useState, useEffect, useRef } from 'react';
import * as SubscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
import { toast } from 'react-toastify';

interface Plan {
  _id: string;
  name: string;
  type: string;
  price: number;
  discountPercentage: number;
  features: string[];
  popular: boolean;
}

const SubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
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
              onClick={() => toast.info('Subscription functionality is currently being reimplemented. Please check back later.')}
            >
              Subscribe Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage; 