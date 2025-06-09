import mongoose, { Document, Schema } from 'mongoose';

export enum SubscriptionPlan {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  HALF_YEARLY = 'half_yearly',
  YEARLY = 'yearly',
  PAID = 'paid'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAYMENT_PENDING = 'payment_pending',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
  UPGRADE_PENDING = 'upgrade_pending',
  DOWNGRADE_PENDING = 'downgrade_pending'
}

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  plan: SubscriptionPlan;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  upiOrderId?: string;
  upiTransactionRef?: string;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  notes?: string;
  parentSubscriptionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  amount: number;
  paymentScreenshotUrl?: string;
  verificationDate?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  isPendingPayment: boolean;
  previousPlan?: SubscriptionPlan;
  previousAmount?: number;
  proratedAmount?: number;
  changeType?: 'upgrade' | 'downgrade';
  effectiveDate?: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    plan: {
      type: String,
      enum: ['free', 'monthly', 'quarterly', 'yearly'],
      required: true
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.PAYMENT_PENDING
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    amount: {
      type: Number,
      required: true
    },
    upiTransactionRef: {
      type: String
    },
    upiOrderId: {
      type: String
    },
    paymentScreenshotUrl: {
      type: String
    },
    verificationDate: {
      type: Date
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String
    },
    isPendingPayment: {
      type: Boolean,
      default: true
    },
    parentSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription'
    },
    previousPlan: {
      type: String,
      enum: Object.values(SubscriptionPlan)
    },
    previousAmount: {
      type: Number
    },
    proratedAmount: {
      type: Number
    },
    changeType: {
      type: String,
      enum: ['upgrade', 'downgrade']
    },
    effectiveDate: {
      type: Date
    }
  },
  { timestamps: true }
);

// Add index for faster queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ upiTransactionRef: 1 });

const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export { Subscription }; 