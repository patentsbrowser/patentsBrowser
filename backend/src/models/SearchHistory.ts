import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patentId: {
    type: String,
    required: true
  },
  source: {
    type: String,
    default: null
  },
  timestamp: {
    type: Number,
    default: () => Date.now()
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add a compound index for userId + patentId to prevent duplicates
searchHistorySchema.index({ userId: 1, patentId: 1 }, { unique: true });

export const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema); 