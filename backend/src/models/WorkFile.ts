import mongoose from 'mongoose';

const workFileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomPatentList',
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
  familyIds: {
    type: [String],
    default: []
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
    default: 'upload'
  }
});

// Add indexes for faster queries
workFileSchema.index({ userId: 1, folderId: 1 });
workFileSchema.index({ patentIds: 1 });

export const WorkFile = mongoose.model('WorkFile', workFileSchema); 