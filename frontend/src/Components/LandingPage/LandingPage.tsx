import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.scss';
import * as SubscriptionService from '../../services/SubscriptionService';

const LandingPage = () => {

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleAuthClick = (mode: 'login' | 'signup') => {
    navigate(mode === 'login' ? '/auth/login' : '/auth/signup');
  };

  const handleForumClick = () => {
    navigate('/forum');
  };

  const handleSubscriptionClick = () => {
    navigate('/auth/signup');
  };

  // Fetch subscription plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      setPlansError(null);
      try {
        const result = await SubscriptionService.getSubscriptionPlans();
        if (result.success) {
          setPlans(result.data);
        } else {
          setPlansError('Failed to load plans');
        }
      } catch (error) {
        setPlansError('Failed to load plans');
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const trialFeatures = [
    'Full search functionality',
    'Save up to 10 patents',
    'Basic analytics tools',
    'Email support'
  ];

  // Helper for plan period display
  const getPlanTypeDisplay = (planType: string) => {
    switch (planType) {
      case 'monthly':
        return 'month';
      case 'quarterly':
        return '3 months';
      case 'half_yearly':
        return '6 months';
      case 'yearly':
        return 'year';
      default:
        return planType;
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="logo">PatentsBrowser</div>
        <div className="auth-buttons">
          <button 
            className="btn btn-forum"
            onClick={handleForumClick}
          >
            Forum
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => handleAuthClick('login')}
          >
            Sign In
          </button>
          <button 
            className="btn btn-signup"
            onClick={() => handleAuthClick('signup')}
          >
            Sign Up
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <h1>Your All-in-One PatentsBrowser Search Solution</h1>
          <p>Discover, analyze, and save patents with our comprehensive search platform</p>
          <div className="trial-info" onClick={() => handleAuthClick('signup')}>
            Try free for <span>14 days</span> - No credit card required
          </div>
        </div>
      </section>

      <section className="trial-section">
        <h2>Start with our 14-Day Free Trial</h2>
        <p>Experience the power of PatentsBrowser with our comprehensive 14-day free trial. No credit card required, cancel anytime.</p>
        
        <div className="trial-card">
          <h3>What's included in the free trial:</h3>
          <div className="trial-features">
            {trialFeatures.map((feature, index) => (
              <div key={index} className="feature">
                <span className="icon">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <button 
            className="btn btn-primary btn-large"
            onClick={handleSubscriptionClick}
          >
            Start Free Trial
          </button>
        </div>
      </section>

      <section className="pricing-section">
        <h2>Subscription Plans</h2>
        <p className="pricing-subtitle">Choose the perfect plan for your needs after your free trial</p>
        <div className="pricing-cards">
          {loadingPlans && <div>Loading plans...</div>}
          {plansError && <div style={{ color: 'red' }}>{plansError}</div>}
          {!loadingPlans && !plansError && plans.map(plan => (
            <div key={plan._id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              <h3>{plan.name}</h3>
              <div className="price">
                <span className="currency">₹</span>
                <span className="amount">{plan.price.toLocaleString('en-IN')}</span>
                <span className="period">/{getPlanTypeDisplay(plan.type)}</span>
              </div>
              {plan.discountPercentage > 0 && (
                <div className="discount">{plan.discountPercentage}% discount</div>
              )}
              <ul className="features">
                {plan.features.map((feature: string, index: number) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              <button 
                className="btn btn-primary"
                onClick={handleSubscriptionClick}
              >
                Subscribe Now
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} PatentsBrowser. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage; 