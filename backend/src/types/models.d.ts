import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name?: string;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  subscription?: {
    plan: string;
    status: string;
    endDate: Date;
  };
  customPatentLists?: string[];
  savedPatents?: string[];
}

export interface IFeedback extends Document {
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface IPricingPlan extends Document {
  name: string;
  price: number;
  duration: number;
  features: string[];
  isActive: boolean;
}

export interface ISubscription extends Document {
  userId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  paymentId?: string;
  orderId?: string;
}

export interface ISavedPatent extends Document {
  userId: string;
  patentNumber: string;
  title: string;
  abstract: string;
  inventors: string[];
  assignees: string[];
  publicationDate: string;
  filingDate: string;
  priority: string[];
  ipcClassification: string[];
  images: string[];
  claims: string[];
  description: string;
  pdfPath?: string;
  customListIds?: string[];
}

export interface ICustomPatentList extends Document {
  userId: string;
  name: string;
  description?: string;
  patentIds: string[];
  createdAt: Date;
  updatedAt: Date;
} 