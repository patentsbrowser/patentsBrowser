import { User } from '../models/User.js';
import { AccountType } from '../models/PricingPlan.js';

/**
 * Determine the account type of a user
 * @param user - The user object
 * @returns AccountType - The account type (INDIVIDUAL or ORGANIZATION)
 */
export const getUserAccountType = (user: any): AccountType => {
  if (!user) {
    return AccountType.INDIVIDUAL;
  }
  
  return user.isOrganization ? AccountType.ORGANIZATION : AccountType.INDIVIDUAL;
};

/**
 * Check if a user can purchase plans
 * @param user - The user object
 * @returns boolean - True if user can purchase plans
 */
export const canUserPurchasePlans = (user: any): boolean => {
  if (!user) {
    return false;
  }
  
  // Organization members cannot purchase plans directly
  if (user.isOrganization && user.organizationRole === 'member') {
    return false;
  }
  
  return true;
};

/**
 * Get the display name for account type
 * @param accountType - The account type
 * @returns string - Display name
 */
export const getAccountTypeDisplayName = (accountType: AccountType): string => {
  switch (accountType) {
    case AccountType.INDIVIDUAL:
      return 'Individual';
    case AccountType.ORGANIZATION:
      return 'Organization';
    default:
      return 'Unknown';
  }
};

/**
 * Validate if a plan is compatible with user's account type
 * @param user - The user object
 * @param planAccountType - The plan's account type
 * @returns boolean - True if compatible
 */
export const isPlanCompatibleWithUser = (user: any, planAccountType: AccountType): boolean => {
  const userAccountType = getUserAccountType(user);
  return userAccountType === planAccountType;
};

/**
 * Get account type from user ID
 * @param userId - The user ID
 * @returns Promise<AccountType> - The account type
 */
export const getAccountTypeFromUserId = async (userId: string): Promise<AccountType> => {
  try {
    const user = await User.findById(userId);
    return getUserAccountType(user);
  } catch (error) {
    console.error('Error getting account type from user ID:', error);
    return AccountType.INDIVIDUAL; // Default fallback
  }
}; 