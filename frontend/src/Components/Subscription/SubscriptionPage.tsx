import React, { useState, useEffect } from 'react';
import subscriptionService from '../../services/SubscriptionService';
import './SubscriptionPage.scss';
import '../LandingPage/LandingPage.scss';
// import './CurrentSubscription.scss';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import PlanChangeModal from './PlanChangeModal';
import PaymentModal from './PaymentModal';
import PlanGrid from '../Common/PlanGrid';
import CurrentSubscriptionCard from '../Common/CurrentSubscriptionCard';
import type { Plan as SubscriptionPlan, Subscription, UserSubscription, SubscriptionStatus } from '../../types/subscription';
import type { Plan as PlanCardPlan } from '../Common/PlanCard';


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
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [planChangeState, setPlanChangeState] = useState<{
    isOpen: boolean;
    currentPlan: SubscriptionPlan | null;
    newPlan: SubscriptionPlan | null;
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

        const [plansData, subscriptionData, currentSubData] = await Promise.all([
          subscriptionService.getUserPlans(),
          subscriptionService.getUserSubscription(),
          // Fetch current subscription details from the new API
          fetch(`${import.meta.env.VITE_API_URL}/subscriptions/user-subscription`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).then(res => res.json()).catch(() => null)
        ]);

        console.log('Plans API Response:', plansData);
        console.log('User Subscription API Response:', subscriptionData);
        console.log('Current Subscription API Response:', currentSubData);
        console.log('Plans length:', plansData?.length);
        console.log('User subscription exists:', !!subscriptionData?.subscription);

        setPlans(plansData);
        setUserSubscription(subscriptionData);
        setCurrentSubscription(currentSubData);

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

  const handleSubscribeClick = (plan: SubscriptionPlan) => {
    console.log('handleSubscribeClick called:', {
      planId: plan._id,
      planName: plan.name,
      userType: user?.userType,
      showPaymentModal,
      selectedPlan: selectedPlan?._id
    });

    if (user?.userType === 'organization_member') {
      toast.info('Organization members cannot purchase plans. Please contact your organization admin.');
      return;
    }

    console.log('Setting selected plan and opening modal');
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePlanChangeClick = (plan: SubscriptionPlan) => {
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
      const [updatedSubscription, updatedCurrentSub] = await Promise.all([
        subscriptionService.getUserSubscription(),
        fetch(`${import.meta.env.VITE_API_URL}/subscriptions/user-subscription`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()).catch(() => null)
      ]);

      setUserSubscription(updatedSubscription);
      setCurrentSubscription(updatedCurrentSub);
      toast.success('Plan change completed successfully');
    } catch (err) {
      toast.error('Failed to update subscription status');
    }
    closePlanChangeModal();
  };

  const getPlanPrice = (plan: SubscriptionPlan) => {
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

  // Map subscription plan to plan card plan
  const mapToPlanCardPlan = (plan: SubscriptionPlan): PlanCardPlan => ({
    _id: plan._id,
    name: plan.name,
    type: plan.type,
    price: plan.price,
    features: plan.features,
    popular: plan.popular,
    discountPercentage: plan.discountPercentage,
    maxMembers: plan.maxMembers,
    additionalMemberPrice: plan.additionalMemberPrice
  });

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
      <div className="subscription-page-wrapper">
        <div className="subscription-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div className="subscription-header" style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Organization Plans</h1>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Choose the perfect plan for your organization's patent research needs</p>
            </div>
            <div className="subscription-plans" style={{ justifyContent: 'center', display: 'flex', padding: 0 }}>
              <div className="plan-card" style={{ maxWidth: 320, width: '100%', padding: '1.2rem 1.2rem' }}>
                <h3 style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>Organization Monthly</h3>
                <div className="price" style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                  <span className="currency" style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>₹</span>
                  <span className="amount" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>2999</span>
                  <span className="period" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginLeft: '0.2rem' }}>/monthly</span>
                </div>
                <ul className="features" style={{ listStyle: 'none', padding: 0, margin: '0 0 1.2rem 0', fontSize: '0.98rem' }}>
                  <li>Up to 10 users included</li>
                  <li>Full access to patent research tools</li>
                  <li>Priority support</li>
                  <li>Admin dashboard for organization</li>
                </ul>
                <button className="subscribe-btn" disabled style={{ width: '100%', fontSize: '1rem', padding: '0.7rem' }}>Contact Admin to Subscribe</button>
              </div>
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

  // Get plan title and subtitle based on user type
  const getPlanSectionInfo = () => {
    if (user?.userType === 'organization_admin' || user?.isOrganization) {
      return {
        title: 'Organization Plans',
        subtitle: 'Choose the perfect plan for your organization\'s patent research needs'
      };
    } else {
      return {
        title: 'Individual Plans',
        subtitle: 'Select the ideal plan for your personal patent research requirements'
      };
    }
  };

  const { title, subtitle } = getPlanSectionInfo();

  return (
    <div className="subscription-page-wrapper">
      <div className="subscription-page">
        {/* Current Subscription Details */}
        <CurrentSubscriptionCard
          userSubscription={currentSubscription}
          loading={loading}
          // error={error}
        />

        {/* Available Plans */}
        <PlanGrid
          plans={plans.map(mapToPlanCardPlan)}
          currentPlanId={userSubscription?.subscription?.plan._id}
          onSubscribeClick={(plan: PlanCardPlan) => handleSubscribeClick(plans.find(p => p._id === plan._id)!)}
          onPlanChangeClick={(plan: PlanCardPlan) => handlePlanChangeClick(plans.find(p => p._id === plan._id)!)}
          userType={user?.userType}
          showMemberInfo={user?.userType === 'organization_admin' || user?.isOrganization}
          loading={loading}
          error={error || undefined}
          title={title}
          subtitle={subtitle}
          getPlanPrice={(plan: PlanCardPlan) => getPlanPrice(plans.find(p => p._id === plan._id)!)}
        />

        {/* Payment Modal */}
        {(showPaymentModal && selectedPlan) && (
          (() => {
            console.log('Rendering PaymentModal:', {
              showPaymentModal,
              selectedPlan: selectedPlan.name,
              isTrialActive: userSubscription?.subscription?.status === 'trial'
            });
            return (
              <PaymentModal
                isOpen={showPaymentModal}
                plan={selectedPlan}
                onClose={() => {
                  console.log('PaymentModal onClose called');
                  setShowPaymentModal(false);
                }}
                onPaymentComplete={handlePlanChangeComplete}
                isTrialActive={userSubscription?.subscription?.status === 'trial'}
                trialDaysRemaining={userSubscription?.subscription?.trialDaysRemaining || 0}
                isOrganizationPlan={userSubscription?.isOrganization || false}
                onSuccess={handlePlanChangeComplete}
              />
            );
          })()
        )}

        {/* Plan Change Modal */}
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
    </div>
  );
};

export default SubscriptionPage; 