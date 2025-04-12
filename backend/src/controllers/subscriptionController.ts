import { Request, Response } from 'express';
import PricingPlan from '../models/PricingPlan.js';

// Simple in-memory cache to minimize database queries
let plansCache = {
  data: null as any[] | null,
  timestamp: 0
};

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

// Get all pricing plans
export const getPricingPlans = async (req: Request, res: Response) => {
  
  try {
    const now = Date.now();

    // Check if we have a valid cache
    if (plansCache.data && (now - plansCache.timestamp) < CACHE_EXPIRY) {
      console.log('Returning cached pricing plans');
      
      return res.status(200).json({
        success: true,
        data: plansCache.data
      });
    }

    // If no valid cache, fetch from database
    console.log('Fetching pricing plans from database');
    const plans = await PricingPlan.find({}).sort({ price: 1 });
    
    // Update cache
    plansCache = {
      data: plans,
      timestamp: now
    };
    
    console.log(`Returning ${plans.length} pricing plans from database`);
    
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