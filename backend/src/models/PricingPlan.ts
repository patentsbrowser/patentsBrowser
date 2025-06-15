import mongoose, { Document, Schema } from 'mongoose';
import { SubscriptionPlan } from './Subscription.js';

export interface IPricingPlan extends Document {
  name: string;
  type: SubscriptionPlan;
  price: number;
  discountPercentage: number;
  features: string[];
  razorpayPlanId?: string;
  popular: boolean;
  planCategory: 'individual' | 'organization';
  organizationBasePrice?: number;
  memberPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

const pricingPlanSchema = new Schema<IPricingPlan>(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    type: {
      type: String,
      enum: Object.values(SubscriptionPlan),
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
    planCategory: {
      type: String,
      enum: ['individual', 'organization'],
      default: 'individual'
    },
    organizationBasePrice: {
      type: Number
    },
    memberPrice: {
      type: Number,
      default: 1000 // ₹1000 per member per month
    }
  },
  { timestamps: true }
);

const PricingPlan = mongoose.model<IPricingPlan>('PricingPlan', pricingPlanSchema);

// Create default pricing plans if none exist
export const createDefaultPlans = async () => {
  const count = await PricingPlan.countDocuments();
  if (count === 0) {
    const defaultPlans = [
      {
        name: 'Monthly',
        type: SubscriptionPlan.MONTHLY,
        price: 999,  // ₹999 for monthly plan
        discountPercentage: 0,
        features: ['Full search access', 'Save up to 50 patents', 'Basic support'],
        popular: false
      },
      {
        name: 'Quarterly',
        type: SubscriptionPlan.QUARTERLY,
        price: 2499, // ₹2,499 for quarterly plan
        discountPercentage: 10,
        features: ['Full search access', 'Save up to 200 patents', 'Priority support', '10% discount'],
        popular: true
      },
      {
        name: 'Half-Yearly',
        type: SubscriptionPlan.HALF_YEARLY,
        price: 4499, // ₹4,499 for half-yearly plan
        discountPercentage: 15,
        features: ['Full search access', 'Unlimited patent saves', 'Premium support', '15% discount'],
        popular: false
      },
      {
        name: 'Yearly',
        type: SubscriptionPlan.YEARLY,
        price: 7999, // ₹7,999 for yearly plan
        discountPercentage: 20,
        features: ['Full search access', 'Unlimited patent saves', 'Premium support', 'API access', '20% discount'],
        popular: false
      }
    ];

    await PricingPlan.insertMany(defaultPlans);
  }
};

export default PricingPlan; 