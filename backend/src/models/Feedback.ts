import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
  email: string;
  comment: string;
  date: Date;
}

const feedbackSchema = new Schema<IFeedback>({
  email: {
    type: String,
    required: true,
    trim: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);

export default Feedback; 