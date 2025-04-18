import mongoose from 'mongoose';

const patentReadStatusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patentId: {
    type: String,
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound index for faster queries and to ensure uniqueness
patentReadStatusSchema.index({ userId: 1, patentId: 1 }, { unique: true });

export const PatentReadStatus = mongoose.model('PatentReadStatus', patentReadStatusSchema); 