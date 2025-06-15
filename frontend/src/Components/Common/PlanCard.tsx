import React from 'react';
import './PlanCard.scss';

export interface Plan {
  _id: string;
  name: string;
  type: string;
  price: number;
  features: string[];
  popular?: boolean;
  discountPercentage?: number;
  maxMembers?: number;
  additionalMemberPrice?: number;
}

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  canUpgrade?: boolean;
  canDowngrade?: boolean;
  onSubscribeClick: (plan: Plan) => void;
  onPlanChangeClick?: (plan: Plan) => void;
  userType?: string;
  showMemberInfo?: boolean;
  price?: number; // Override price for member pricing
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan = false,
  canUpgrade = false,
  canDowngrade = false,
  onSubscribeClick,
  onPlanChangeClick,
  userType,
  showMemberInfo = false,
  price
}) => {
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

  const displayPrice = price || plan.price;

  const handleButtonClick = () => {
    console.log('PlanCard button clicked:', {
      planId: plan._id,
      planName: plan.name,
      userType,
      isCurrentPlan,
      canUpgrade,
      canDowngrade
    });

    if (userType === 'organization_member') {
      console.log('Organization member - no action');
      return; // Handled by parent component
    }

    if (isCurrentPlan) {
      console.log('Current plan - no action');
      return; // Current plan, no action
    }

    if (onPlanChangeClick && (canUpgrade || canDowngrade)) {
      console.log('Calling onPlanChangeClick');
      onPlanChangeClick(plan);
    } else {
      console.log('Calling onSubscribeClick');
      onSubscribeClick(plan);
    }
  };

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (canUpgrade) return 'Upgrade';
    if (canDowngrade) return 'Downgrade';
    return 'Subscribe Now';
  };

  const getButtonClass = () => {
    if (isCurrentPlan) return 'btn btn-primary current-plan-btn';
    if (canUpgrade) return 'btn btn-primary upgrade-btn';
    if (canDowngrade) return 'btn btn-outline downgrade-btn';
    return 'btn btn-primary';
  };

  return (
    <div className={`pricing-card${plan.popular ? ' popular' : ''}`}>
      {plan.popular && <div className="popular-badge">Most Popular</div>}
      
      <h3>{plan.name}</h3>
      
      <div className="price">
        <span className="currency">₹</span>
        <span className="amount">{displayPrice.toLocaleString('en-IN')}</span>
        <span className="period">/{getPlanTypeDisplay(plan.type)}</span>
      </div>
      
      {showMemberInfo && userType === 'organization' && plan.maxMembers && (
        <div className="member-info">
          <div className="member-count">
            {plan.maxMembers === -1 ? 'Unlimited members' : `Up to ${plan.maxMembers} members`}
          </div>
          {plan.additionalMemberPrice && plan.maxMembers !== -1 && (
            <div className="additional-price">
              + ₹{plan.additionalMemberPrice.toLocaleString('en-IN')} per additional member
            </div>
          )}
        </div>
      )}
      
      {plan.discountPercentage > 0 && (
        <div className="discount">{plan.discountPercentage}% discount</div>
      )}
      
      <ul className="features">
        {plan.features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
      
      <button
        className={getButtonClass()}
        onClick={handleButtonClick}
        disabled={isCurrentPlan || userType === 'organization_member'}
      >
        {getButtonText()}
      </button>
      
      {userType === 'organization_member' && (
        <div className="member-notice">
          Contact your organization admin to change plans
        </div>
      )}
    </div>
  );
};

export default PlanCard;
