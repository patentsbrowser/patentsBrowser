import React from 'react';
import PlanCard, { Plan } from './PlanCard';
import './PlanGrid.scss';

interface PlanGridProps {
  plans: Plan[];
  currentPlanId?: string;
  onSubscribeClick: (plan: Plan) => void;
  onPlanChangeClick?: (plan: Plan) => void;
  userType?: string;
  showMemberInfo?: boolean;
  loading?: boolean;
  error?: string;
  title?: string;
  subtitle?: string;
  getPlanPrice?: (plan: Plan) => number;
}

const PlanGrid: React.FC<PlanGridProps> = ({
  plans,
  currentPlanId,
  onSubscribeClick,
  onPlanChangeClick,
  userType,
  showMemberInfo = false,
  loading = false,
  error = null,
  title,
  subtitle,
  getPlanPrice
}) => {
  if (loading) {
    return (
      <div className="plan-grid-loading">
        <div className="loading-spinner"></div>
        <p>Loading plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="plan-grid-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="plan-grid-empty">
        <div className="empty-icon">📋</div>
        <p>No plans available</p>
      </div>
    );
  }

  return (
    <div className="plan-grid-container">
      {title && (
        <div className="plan-grid-header">
          <h2>{title}</h2>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
      )}
      
      <div className="plan-grid">
        {plans.map(plan => {
          const isCurrentPlan = currentPlanId === plan._id;
          const canUpgrade = currentPlanId && plan.price > (plans.find(p => p._id === currentPlanId)?.price || 0);
          const canDowngrade = currentPlanId && plan.price < (plans.find(p => p._id === currentPlanId)?.price || 0);
          const planPrice = getPlanPrice ? getPlanPrice(plan) : plan.price;

          return (
            <PlanCard
              key={plan._id}
              plan={plan}
              isCurrentPlan={isCurrentPlan}
              canUpgrade={!!canUpgrade}
              canDowngrade={!!canDowngrade}
              onSubscribeClick={onSubscribeClick}
              onPlanChangeClick={onPlanChangeClick}
              userType={userType}
              showMemberInfo={showMemberInfo}
              price={planPrice}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PlanGrid;
