import mongoose from 'mongoose';
import PricingPlan from '../dist/models/PricingPlan.js';
import dotenv from 'dotenv';

dotenv.config();

const organizationPlans = [
  // Monthly Organization Plans
  {
    name: 'Organization Starter',
    type: 'monthly',
    price: 5000,
    discountPercentage: 0,
    features: [
      'Up to 10 team members',
      'Advanced patent search',
      'Team collaboration tools',
      'Basic analytics dashboard',
      'Email support',
      'Organization-wide access'
    ],
    planCategory: 'organization',
    organizationBasePrice: 5000,
    memberPrice: 500,
    popular: false
  },
  {
    name: 'Organization Professional',
    type: 'monthly',
    price: 10000,
    discountPercentage: 15,
    features: [
      'Up to 50 team members',
      'Advanced patent search & analytics',
      'Priority support',
      'Custom integrations',
      'Advanced reporting',
      'Team management dashboard',
      'API access',
      'Organization-wide access'
    ],
    planCategory: 'organization',
    organizationBasePrice: 10000,
    memberPrice: 800,
    popular: true
  },
  {
    name: 'Organization Enterprise',
    type: 'monthly',
    price: 25000,
    discountPercentage: 20,
    features: [
      'Unlimited team members',
      'Full patent analytics suite',
      'Dedicated account manager',
      'Custom development',
      'Advanced security features',
      'White-label options',
      'SLA guarantee',
      'Organization-wide access'
    ],
    planCategory: 'organization',
    organizationBasePrice: 25000,
    memberPrice: 1000,
    popular: false
  },
  // Quarterly Organization Plans
  {
    name: 'Organization Starter Quarterly',
    type: 'quarterly',
    price: 13500, // 10% discount
    discountPercentage: 10,
    features: [
      'Up to 10 team members',
      'Advanced patent search',
      'Team collaboration tools',
      'Basic analytics dashboard',
      'Email support',
      'Organization-wide access',
      '3 months validity'
    ],
    planCategory: 'organization',
    organizationBasePrice: 13500,
    memberPrice: 1350,
    popular: false
  },
  {
    name: 'Organization Professional Quarterly',
    type: 'quarterly',
    price: 25500, // 15% discount
    discountPercentage: 15,
    features: [
      'Up to 50 team members',
      'Advanced patent search & analytics',
      'Priority support',
      'Custom integrations',
      'Advanced reporting',
      'Team management dashboard',
      'API access',
      'Organization-wide access',
      '3 months validity'
    ],
    planCategory: 'organization',
    organizationBasePrice: 25500,
    memberPrice: 2040,
    popular: true
  },
  {
    name: 'Organization Enterprise Quarterly',
    type: 'quarterly',
    price: 60000, // 20% discount
    discountPercentage: 20,
    features: [
      'Unlimited team members',
      'Full patent analytics suite',
      'Dedicated account manager',
      'Custom development',
      'Advanced security features',
      'White-label options',
      'SLA guarantee',
      'Organization-wide access',
      '3 months validity'
    ],
    planCategory: 'organization',
    organizationBasePrice: 60000,
    memberPrice: 2400,
    popular: false
  },
  // Yearly Organization Plans
  {
    name: 'Organization Starter Yearly',
    type: 'yearly',
    price: 48000, // 20% discount
    discountPercentage: 20,
    features: [
      'Up to 10 team members',
      'Advanced patent search',
      'Team collaboration tools',
      'Basic analytics dashboard',
      'Email support',
      'Organization-wide access',
      '12 months validity',
      'Best value for money'
    ],
    planCategory: 'organization',
    organizationBasePrice: 48000,
    memberPrice: 4800,
    popular: false
  },
  {
    name: 'Organization Professional Yearly',
    type: 'yearly',
    price: 90000, // 25% discount
    discountPercentage: 25,
    features: [
      'Up to 50 team members',
      'Advanced patent search & analytics',
      'Priority support',
      'Custom integrations',
      'Advanced reporting',
      'Team management dashboard',
      'API access',
      'Organization-wide access',
      '12 months validity',
      'Best value for money'
    ],
    planCategory: 'organization',
    organizationBasePrice: 90000,
    memberPrice: 7200,
    popular: true
  },
  {
    name: 'Organization Enterprise Yearly',
    type: 'yearly',
    price: 210000, // 30% discount
    discountPercentage: 30,
    features: [
      'Unlimited team members',
      'Full patent analytics suite',
      'Dedicated account manager',
      'Custom development',
      'Advanced security features',
      'White-label options',
      'SLA guarantee',
      'Organization-wide access',
      '12 months validity',
      'Maximum savings'
    ],
    planCategory: 'organization',
    organizationBasePrice: 210000,
    memberPrice: 8400,
    popular: false
  }
];

const individualPlans = [
  // Monthly Individual Plans
  {
    name: 'Individual Basic',
    type: 'monthly',
    price: 999,
    discountPercentage: 0,
    features: [
      '100 patent searches per month',
      'Basic search filters',
      'Download patents',
      'Email support',
      'Save up to 50 patents'
    ],
    planCategory: 'individual',
    popular: false
  },
  {
    name: 'Individual Pro',
    type: 'monthly',
    price: 1999,
    discountPercentage: 10,
    features: [
      '500 patent searches per month',
      'Advanced search filters',
      'Patent analytics',
      'Priority support',
      'Export to multiple formats',
      'Save unlimited patents',
      'Custom patent lists'
    ],
    planCategory: 'individual',
    popular: true
  },
  {
    name: 'Individual Premium',
    type: 'monthly',
    price: 3999,
    discountPercentage: 15,
    features: [
      'Unlimited patent searches',
      'AI-powered insights',
      'Custom alerts',
      'API access',
      'Dedicated support',
      'Advanced analytics',
      'Priority processing'
    ],
    planCategory: 'individual',
    popular: false
  },
  // Quarterly Individual Plans
  {
    name: 'Individual Basic Quarterly',
    type: 'quarterly',
    price: 2699, // 10% discount
    discountPercentage: 10,
    features: [
      '100 patent searches per month',
      'Basic search filters',
      'Download patents',
      'Email support',
      'Save up to 50 patents',
      '3 months validity'
    ],
    planCategory: 'individual',
    popular: false
  },
  {
    name: 'Individual Pro Quarterly',
    type: 'quarterly',
    price: 5097, // 15% discount
    discountPercentage: 15,
    features: [
      '500 patent searches per month',
      'Advanced search filters',
      'Patent analytics',
      'Priority support',
      'Export to multiple formats',
      'Save unlimited patents',
      'Custom patent lists',
      '3 months validity'
    ],
    planCategory: 'individual',
    popular: true
  },
  {
    name: 'Individual Premium Quarterly',
    type: 'quarterly',
    price: 9597, // 20% discount
    discountPercentage: 20,
    features: [
      'Unlimited patent searches',
      'AI-powered insights',
      'Custom alerts',
      'API access',
      'Dedicated support',
      'Advanced analytics',
      'Priority processing',
      '3 months validity'
    ],
    planCategory: 'individual',
    popular: false
  },
  // Yearly Individual Plans
  {
    name: 'Individual Basic Yearly',
    type: 'yearly',
    price: 9591, // 20% discount
    discountPercentage: 20,
    features: [
      '100 patent searches per month',
      'Basic search filters',
      'Download patents',
      'Email support',
      'Save up to 50 patents',
      '12 months validity',
      'Best value for money'
    ],
    planCategory: 'individual',
    popular: false
  },
  {
    name: 'Individual Pro Yearly',
    type: 'yearly',
    price: 17991, // 25% discount
    discountPercentage: 25,
    features: [
      '500 patent searches per month',
      'Advanced search filters',
      'Patent analytics',
      'Priority support',
      'Export to multiple formats',
      'Save unlimited patents',
      'Custom patent lists',
      '12 months validity',
      'Best value for money'
    ],
    planCategory: 'individual',
    popular: true
  },
  {
    name: 'Individual Premium Yearly',
    type: 'yearly',
    price: 35991, // 25% discount
    discountPercentage: 25,
    features: [
      'Unlimited patent searches',
      'AI-powered insights',
      'Custom alerts',
      'API access',
      'Dedicated support',
      'Advanced analytics',
      'Priority processing',
      '12 months validity',
      'Maximum savings'
    ],
    planCategory: 'individual',
    popular: false
  }
];

async function seedPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patentsBrowser');
    console.log('Connected to MongoDB');

    // Clear existing plans to avoid duplicates
    await PricingPlan.deleteMany({});
    console.log('Cleared existing plans');

    // Insert organization plans
    const orgPlansResult = await PricingPlan.insertMany(organizationPlans);
    console.log(`Inserted ${orgPlansResult.length} organization plans`);

    // Insert individual plans
    const indPlansResult = await PricingPlan.insertMany(individualPlans);
    console.log(`Inserted ${indPlansResult.length} individual plans`);

    console.log('Successfully seeded pricing plans!');
    
    // Display the created plans
    const allPlans = await PricingPlan.find({});
    console.log('\nAll plans in database:');
    allPlans.forEach(plan => {
      console.log(`- ${plan.name} (${plan.planCategory}): ₹${plan.price}/month`);
    });

  } catch (error) {
    console.error('Error seeding plans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedPlans();
