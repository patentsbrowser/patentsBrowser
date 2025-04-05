import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.scss';

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const navigate = useNavigate();
  
  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    navigate(mode === 'login' ? '/auth/login' : '/auth/signup');
  };

  const handleForumClick = () => {
    navigate('/forum');
  };

  const handleSubscriptionClick = () => {
    navigate('/subscription');
  };

  const subscriptionPlans = [
    { id: 1, name: 'Monthly', price: 150, period: 'month', features: ['Full search access', 'Save up to 50 patents', 'Basic support'], popular: false },
    { id: 2, name: 'Quarterly', price: 400, period: '3 months', features: ['Full search access', 'Save up to 200 patents', 'Priority support', '10% discount'], popular: true },
    { id: 3, name: 'Half-Yearly', price: 750, period: '6 months', features: ['Full search access', 'Unlimited patent saves', 'Premium support', '15% discount'], popular: false },
    { id: 4, name: 'Yearly', price: 1200, period: 'year', features: ['Full search access', 'Unlimited patent saves', 'Premium support', 'API access', '20% discount'], popular: false },
  ];

  const trialFeatures = [
    'Full search functionality',
    'Save up to 10 patents',
    'Basic analytics tools',
    'Email support'
  ];

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="logo">AllinoneSearch</div>
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
          <h1>Your All-in-One Patent Search Solution</h1>
          <p>Discover, analyze, and save patents with our comprehensive search platform</p>
          <div className="trial-info">
            Try free for <span>14 days</span> - No credit card required
          </div>
        </div>
      </section>

      <section className="trial-section">
        <h2>Start with our 14-Day Free Trial</h2>
        <p>Experience the power of AllinoneSearch with our comprehensive 14-day free trial. No credit card required, cancel anytime.</p>
        
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
          {subscriptionPlans.map(plan => (
            <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              <h3>{plan.name}</h3>
              <div className="price">
                <span className="dollar-sign">$</span>
                <span className="amount">{plan.price}</span>
                <span className="period">/{plan.period}</span>
              </div>
              <ul className="features">
                {plan.features.map((feature, index) => (
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
        <p>&copy; {new Date().getFullYear()} AllinoneSearch. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage; 