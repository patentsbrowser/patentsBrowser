import mongoose from 'mongoose';

const savedPatentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patentId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const SavedPatent = mongoose.model('SavedPatent', savedPatentSchema); 