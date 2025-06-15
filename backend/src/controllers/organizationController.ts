import { Request, Response } from 'express';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import crypto from 'crypto';
import { Subscription } from '../models/Subscription.js';

// Create a new organization
export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, size, type } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Create organization
    const organization = new Organization({
      name,
      size,
      type,
      adminId: userId,
      members: [{
        userId,
        role: 'admin',
        joinedAt: new Date()
      }],
      subscription: {
        plan: 'trial',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        status: 'trial',
        basePrice: 4000, // ₹4000 base price for organization
        memberPrice: 1000 // ₹1000 per member
      }
    });

    await organization.save();

    // Update user with organization details and set as organization admin
    await User.findByIdAndUpdate(userId, {
      isOrganization: true,
      organizationName: name,
      organizationSize: size,
      organizationType: type,
      organizationId: organization._id,
      organizationRole: 'admin',
      userType: 'organization_admin'
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: organization
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create organization'
    });
  }
};

// Generate invite link
export const generateInviteLink = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if user is organization admin
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only organization admin can generate invite links
    if (user.userType !== 'organization_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only organization administrators can generate invite links'
      });
    }

    // Debug: Log user data
    console.log('User data:', {
      userId,
      userType: user.userType,
      organizationId: user.organizationId,
      isOrganization: user.isOrganization
    });

    // Find organization by adminId
    const organization = await Organization.findOne({ adminId: userId });
    console.log('Organization found:', organization ? 'Yes' : 'No');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found. Please create an organization first.',
        debug: {
          userId,
          userType: user.userType,
          organizationId: user.organizationId
        }
      });
    }

    // Generate unique token (single use)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry but single use

    // Add invite link
    organization.inviteLinks.push({
      token,
      createdAt: new Date(),
      expiresAt,
      used: false
    });

    await organization.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const inviteLink = `${frontendUrl}/join-organization/${token}`;

    res.status(200).json({
      success: true,
      message: 'Invite link generated successfully',
      data: { inviteLink }
    });
  } catch (error) {
    console.error('Error generating invite link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invite link'
    });
  }
};

// Join organization using invite link
export const joinOrganization = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const organization = await Organization.findOne({
      'inviteLinks.token': token,
      'inviteLinks.used': false,
      'inviteLinks.expiresAt': { $gt: new Date() }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invite link'
      });
    }

    // Check if user is already a member
    const isMember = organization.members.some(member => member.userId.toString() === userId);
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this organization'
      });
    }

    // Add user as member
    organization.members.push({
      userId,
      role: 'member',
      joinedAt: new Date()
    });

    // Mark invite link as used
    const inviteLink = organization.inviteLinks.find(link => link.token === token);
    if (inviteLink) {
      inviteLink.used = true;
    }

    await organization.save();

    // Update user with organization details and userType
    await User.findByIdAndUpdate(userId, {
      isOrganization: true,
      organizationName: organization.name,
      organizationSize: organization.size,
      organizationType: organization.type,
      organizationId: organization._id,
      organizationRole: 'member',
      userType: 'organization_member'
    });

    console.log(`User ${userId} successfully joined organization ${organization._id} as member`);

    res.status(200).json({
      success: true,
      message: 'Successfully joined organization',
      data: organization
    });
  } catch (error) {
    console.error('Error joining organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join organization'
    });
  }
};

// Get organization details
export const getOrganizationDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await User.findById(userId);
    if (!user?.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'User is not part of any organization'
      });
    }

    const organization = await Organization.findById(user.organizationId)
      .populate('members.userId', 'name email');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.status(200).json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Error fetching organization details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization details'
    });
  }
};

// Remove member from organization
export const removeMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const organization = await Organization.findOne({ adminId: userId });
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Remove member
    organization.members = organization.members.filter(
      member => member.userId.toString() !== memberId
    );

    await organization.save();

    // Update user's organization details and reset userType
    await User.findByIdAndUpdate(memberId, {
      isOrganization: false,
      organizationName: undefined,
      organizationSize: undefined,
      organizationType: undefined,
      organizationId: undefined,
      organizationRole: undefined,
      userType: 'individual'
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  }
};

// Update organization subscription
export const updateOrganizationSubscription = async (req: Request, res: Response) => {
  try {
    const { plan, startDate, endDate } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const organization = await Organization.findOne({ adminId: userId });
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Update subscription
    organization.subscription = {
      ...organization.subscription,
      plan,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'active'
    };

    await organization.save();

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: organization.subscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
};

// Get invited members (pending invitations)
export const getInvitedMembers = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Only organization admin can view invited members
    if (user.userType !== 'organization_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only organization administrators can view invited members'
      });
    }

    // Find organization by adminId
    const organization = await Organization.findOne({ adminId: userId });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get active invite links (not used and not expired)
    const activeInvites = organization.inviteLinks.filter(invite =>
      !invite.used && invite.expiresAt > new Date()
    );

    const invitedMembers = activeInvites.map(invite => ({
      token: invite.token,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/join-organization/${invite.token}`,
      status: 'pending'
    }));

    res.status(200).json({
      success: true,
      message: 'Invited members retrieved successfully',
      data: invitedMembers
    });
  } catch (error) {
    console.error('Error getting invited members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invited members'
    });
  }
};

// Validate invite link
export const validateInviteLink = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invite token is required'
      });
    }

    // Find organization with the invite token
    const organization = await Organization.findOne({
      'inviteLinks.token': token,
      'inviteLinks.used': false,
      'inviteLinks.expiresAt': { $gt: new Date() }
    }).populate('adminId', 'name');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invite link'
      });
    }

    // Return organization details for display
    res.status(200).json({
      success: true,
      data: {
        name: organization.name,
        size: organization.size,
        type: organization.type,
        adminName: organization.adminId.name
      }
    });
  } catch (error) {
    console.error('Error validating invite link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate invite link'
    });
  }
};

export const getOrganizationMembers = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Only organization admin can view members
    if (user.userType !== 'organization_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only organization administrators can view members'
      });
    }

    // Find organization by adminId
    const organization = await Organization.findOne({ adminId: userId })
      .populate('members.userId', 'name email');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const members = organization.members.map(m => ({
      _id: m.userId._id,
      name: m.userId.name,
      email: m.userId.email,
      role: m.role,
      joinedAt: m.joinedAt
    }));
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load organization members' });
  }
};