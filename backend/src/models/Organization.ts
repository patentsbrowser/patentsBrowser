import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  size: string;
  type: string;
  adminId: mongoose.Types.ObjectId;
  members: Array<{
    userId: mongoose.Types.ObjectId;
    role: 'admin' | 'member';
    joinedAt: Date;
  }>;
  subscription: {
    plan: string;
    startDate: Date;
    endDate: Date;
    status: string;
    basePrice: number;
    memberPrice: number;
  };
  inviteLinks: Array<{
    token: string;
    createdAt: Date;
    expiresAt: Date;
    used: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501+'],
      required: true
    },
    type: {
      type: String,
      enum: ['startup', 'enterprise', 'government', 'educational', 'research', 'other'],
      required: true
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }],
    subscription: {
      plan: {
        type: String,
        required: true
      },
      startDate: {
        type: Date,
        required: true
      },
      endDate: {
        type: Date,
        required: true
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'trial', 'expired'],
        default: 'trial'
      },
      basePrice: {
        type: Number,
        required: true
      },
      memberPrice: {
        type: Number,
        required: true,
        default: 1000 // ₹1000 per member per month
      }
    },
    inviteLinks: [{
      token: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: {
        type: Date,
        required: true
      },
      used: {
        type: Boolean,
        default: false
      }
    }]
  },
  { timestamps: true }
);

// Add indexes for faster queries
organizationSchema.index({ adminId: 1 });
organizationSchema.index({ 'members.userId': 1 });
organizationSchema.index({ 'inviteLinks.token': 1 });

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema); 