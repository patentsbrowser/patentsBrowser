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
  workFiles: [{
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
    }
  }],
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

// Add indexes for faster queries
customPatentListSchema.index({ userId: 1 });
customPatentListSchema.index({ patentIds: 1 });

export const CustomPatentList = mongoose.model('CustomPatentList', customPatentListSchema); 