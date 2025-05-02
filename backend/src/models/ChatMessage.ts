import mongoose from 'mongoose';

// Schema for storing chat messages
const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  patentId: {
    type: String,
    required: false,
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
  metadata: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Schema for predefined Q&A pairs
const predefinedQASchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    index: true,
  },
  answer: {
    type: String,
    required: true,
  },
  keywords: {
    type: [String],
    default: [],
    index: true,
  },
  category: {
    type: String,
    enum: ['general', 'patent', 'search', 'technical', 'other'],
    default: 'general',
    index: true,
  },
  patentId: {
    type: String,
    required: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

predefinedQASchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create text index for semantic search
chatMessageSchema.index({ message: 'text', response: 'text' });
predefinedQASchema.index({ question: 'text', answer: 'text' });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export const PredefinedQA = mongoose.model('PredefinedQA', predefinedQASchema);

export default { ChatMessage, PredefinedQA }; 