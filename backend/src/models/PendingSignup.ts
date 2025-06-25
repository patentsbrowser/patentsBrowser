import mongoose from 'mongoose';

interface IPendingSignup extends mongoose.Document {
  email: string;
  signupData: {
    name?: string;
    email: string;
    password: string;
    isOrganization?: boolean;
    organizationName?: string;
    organizationSize?: string;
    organizationType?: string;
    userType: 'individual' | 'organization_admin' | 'organization_member';
    inviteToken?: string;
    organizationId?: mongoose.Types.ObjectId;
  };
  otp: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pendingSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  signupData: {
    name: {
      type: String,
      required: false,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    isOrganization: {
      type: Boolean,
      default: false
    },
    organizationName: {
      type: String,
      trim: true
    },
    organizationSize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501+']
    },
    organizationType: {
      type: String,
      enum: ['startup', 'enterprise', 'government', 'educational', 'research', 'other']
    },
    userType: {
      type: String,
      enum: ['individual', 'organization_admin', 'organization_member'],
      default: 'individual'
    },
    inviteToken: {
      type: String
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    }
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired documents
  }
}, { 
  timestamps: true 
});

// Create index for email lookups
pendingSignupSchema.index({ email: 1 });

// Create index for expiration cleanup
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingSignup = mongoose.model<IPendingSignup>('PendingSignup', pendingSignupSchema); 