import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['verified', 'unverified', 'rejected', 'cancelled', 'inactive', 'active', 'paid'],
    default: 'unverified'
  },
  referenceNumber: {
    type: String,
    required: true
  },
  plan: {
    type: String,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  verificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationNotes: String,
  rejectionReason: String,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  planName: String,
  userSubscriptionStatus: String,
  orderDetails: {
    orderId: String,
    planId: String
  }
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment; 