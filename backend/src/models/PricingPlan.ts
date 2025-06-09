import mongoose, { Document, Schema } from 'mongoose';
import { SubscriptionPlan } from './Subscription.js';

export enum AccountType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization'
}

export interface IPricingPlan extends Document {
  name: string;
  type: SubscriptionPlan;
  accountType: AccountType;
  price: number;
  discountPercentage: number;
  features: string[];
  razorpayPlanId?: string;
  popular: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pricingPlanSchema = new Schema<IPricingPlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      required: true
    },
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    discountPercentage: {
      type: Number,
      default: 0
    },
    features: [{
      type: String
    }],
    razorpayPlanId: {
      type: String
    },
    popular: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Add compound index for efficient queries
pricingPlanSchema.index({ accountType: 1, type: 1 });
pricingPlanSchema.index({ accountType: 1, isActive: 1 });

const PricingPlan = mongoose.model<IPricingPlan>('PricingPlan', pricingPlanSchema);

// Create default pricing plans if none exist
export const createDefaultPlans = async () => {
  const count = await PricingPlan.countDocuments();
  if (count === 0) {
    const defaultPlans = [
      // Individual Plans
      {
        name: 'Individual Monthly',
        type: SubscriptionPlan.MONTHLY,
        accountType: AccountType.INDIVIDUAL,
        price: 999,  // ₹999 for monthly plan
        discountPercentage: 0,
        features: ['Full search access', 'Save up to 50 patents', 'Basic support'],
        popular: false,
        isActive: true
      },
      {
        name: 'Individual Quarterly',
        type: SubscriptionPlan.QUARTERLY,
        accountType: AccountType.INDIVIDUAL,
        price: 2499, // ₹2,499 for quarterly plan
        discountPercentage: 10,
        features: ['Full search access', 'Save up to 200 patents', 'Priority support', '10% discount'],
        popular: true,
        isActive: true
      },
      {
        name: 'Individual Half-Yearly',
        type: SubscriptionPlan.HALF_YEARLY,
        accountType: AccountType.INDIVIDUAL,
        price: 4499, // ₹4,499 for half-yearly plan
        discountPercentage: 15,
        features: ['Full search access', 'Unlimited patent saves', 'Premium support', '15% discount'],
        popular: false,
        isActive: true
      },
      {
        name: 'Individual Yearly',
        type: SubscriptionPlan.YEARLY,
        accountType: AccountType.INDIVIDUAL,
        price: 7999, // ₹7,999 for yearly plan
        discountPercentage: 20,
        features: ['Full search access', 'Unlimited patent saves', 'Premium support', 'API access', '20% discount'],
        popular: false,
        isActive: true
      },
      
      // Organization Plans
      {
        name: 'Organization Monthly',
        type: SubscriptionPlan.MONTHLY,
        accountType: AccountType.ORGANIZATION,
        price: 2999,  // ₹2,999 for organization monthly plan
        discountPercentage: 0,
        features: ['Full search access', 'Unlimited patent saves', 'Team collaboration', 'Admin dashboard', 'Basic support'],
        popular: false,
        isActive: true
      },
      {
        name: 'Organization Quarterly',
        type: SubscriptionPlan.QUARTERLY,
        accountType: AccountType.ORGANIZATION,
        price: 7499, // ₹7,499 for organization quarterly plan
        discountPercentage: 10,
        features: ['Full search access', 'Unlimited patent saves', 'Team collaboration', 'Admin dashboard', 'Priority support', '10% discount'],
        popular: true,
        isActive: true
      },
      {
        name: 'Organization Half-Yearly',
        type: SubscriptionPlan.HALF_YEARLY,
        accountType: AccountType.ORGANIZATION,
        price: 13499, // ₹13,499 for organization half-yearly plan
        discountPercentage: 15,
        features: ['Full search access', 'Unlimited patent saves', 'Team collaboration', 'Admin dashboard', 'Premium support', '15% discount'],
        popular: false,
        isActive: true
      },
      {
        name: 'Organization Yearly',
        type: SubscriptionPlan.YEARLY,
        accountType: AccountType.ORGANIZATION,
        price: 23999, // ₹23,999 for organization yearly plan
        discountPercentage: 20,
        features: ['Full search access', 'Unlimited patent saves', 'Team collaboration', 'Admin dashboard', 'Premium support', 'API access', '20% discount'],
        popular: false,
        isActive: true
      }
    ];

    await PricingPlan.insertMany(defaultPlans);
  }
};

export default PricingPlan; 