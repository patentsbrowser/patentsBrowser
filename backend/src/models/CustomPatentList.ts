import mongoose from 'mongoose';

const customPatentListSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  patentIds: {
    type: [String],
    required: true
  },
  timestamp: {
    type: Number,
    default: () => Date.now()
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: null
  }
});

export const CustomPatentList = mongoose.model('CustomPatentList', customPatentListSchema); 