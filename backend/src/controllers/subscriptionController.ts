import { Request, Response } from 'express';
import PricingPlan from '../models/PricingPlan.js';

// Get all pricing plans
export const getPricingPlans = async (req: Request, res: Response) => {
  try {
    const plans = await PricingPlan.find({}).sort({ price: 1 });
    
    return res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pricing plans'
    });
  }
};

// Export only the getPricingPlans method
export default {
  getPricingPlans
}; 