export type AccountType = 'individual' | 'organization';
export type SubscriptionStatus = 'active' | 'inactive' | 'payment_pending' | 'upgrade_pending' | 'downgrade_pending' | 'trial' | 'cancelled' | 'rejected' | 'paid';
export type PlanType = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type OrganizationRole = 'admin' | 'member';

export interface Plan {
  _id: string;
  name: string;
  type: PlanType;
  price: number;
  discountPercentage: number;
  features: string[];
  popular: boolean;
  accountType: AccountType;
  organizationPrice?: number;
  memberPrice?: number;
  isActive: boolean;
  maxMembers?: number;
  additionalMemberPrice?: number;
}

export interface Subscription {
  _id: string;
  plan: Plan;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  isPendingPayment: boolean;
  trialDaysRemaining?: number;
  previousPlan?: Plan;
  previousAmount?: number;
  proratedAmount?: number;
  changeType?: 'upgrade' | 'downgrade';
  effectiveDate?: string;
  parentSubscriptionId?: string;
  stackedPlans?: Subscription[];
  totalBenefits?: {
    maxSearches: number;
    maxExports: number;
    maxSavedPatents: number;
    additionalFeatures: string[];
  };
}

export interface UserSubscription {
  subscription: Subscription;
  isOrganization: boolean;
  organizationRole?: OrganizationRole;
  organizationName?: string;
  organizationSize?: string;
  organizationType?: string;
  memberCount?: number;
  trialEndDate?: string;
  trialStartDate?: string;
}

export interface PlanChangeRequest {
  newPlanId: string;
  isUpgrade: boolean;
  proratedAmount?: number;
  effectiveDate?: string;
}

export interface PaymentVerification {
  subscriptionId: string;
  transactionId: string;
  paymentScreenshotUrl?: string;
  amount: number;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;
} 