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

export const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema); 