// Shared pending signups store to avoid duplication between routes and controllers
// Temporary in-memory store for pending signups (for production, use Redis)

import { PendingSignup } from '../models/PendingSignup.js';

export const addPendingSignup = async (email: string, data: any) => {
  try {
    // Delete any existing pending signup for this email
    await PendingSignup.deleteOne({ email });
    
    // Ensure all required fields are present and properly formatted
    const pendingSignupData = {
      email,
      signupData: {
        ...(data.signupData.name && { name: data.signupData.name.trim() }), // Only include name if provided
        email: data.signupData.email.trim().toLowerCase(),
        password: data.signupData.password,
        isOrganization: data.signupData.isOrganization || false,
        userType: data.signupData.userType || 'individual',
        ...(data.signupData.organizationName && { organizationName: data.signupData.organizationName.trim() }),
        ...(data.signupData.organizationSize && { organizationSize: data.signupData.organizationSize }),
        ...(data.signupData.organizationType && { organizationType: data.signupData.organizationType })
      },
      otp: data.otp,
      expiresAt: new Date(data.expiresAt)
    };
    
    // Create new pending signup with validated data
    const pendingSignup = new PendingSignup(pendingSignupData);
    await pendingSignup.save();
    console.log('Pending signup added to database for:', email);
  } catch (error) {
    console.error('Error adding pending signup:', error);
    throw new Error('Failed to add pending signup');
  }
};

export const getPendingSignup = async (email: string) => {
  try {
    const pendingSignup = await PendingSignup.findOne({ 
      email,
      expiresAt: { $gt: new Date() }
    });
    
    if (!pendingSignup) {
      return null;
    }
    
    return {
      signupData: pendingSignup.signupData,
      otp: pendingSignup.otp,
      expiresAt: pendingSignup.expiresAt.getTime()
    };
  } catch (error) {
    console.error('Error getting pending signup:', error);
    return null;
  }
};

export const removePendingSignup = async (email: string) => {
  try {
    await PendingSignup.deleteOne({ email });
    console.log('Pending signup removed from database for:', email);
  } catch (error) {
    console.error('Error removing pending signup:', error);
  }
};

export const hasPendingSignup = async (email: string) => {
  try {
    const pendingSignup = await PendingSignup.findOne({ 
      email,
      expiresAt: { $gt: new Date() }
    });
    return !!pendingSignup;
  } catch (error) {
    console.error('Error checking pending signup:', error);
    return false;
  }
}; 