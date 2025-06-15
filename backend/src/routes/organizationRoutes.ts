import express from "express";
import { auth } from "../middleware/auth.js";
import {
  createOrganization,
  generateInviteLink,
  joinOrganization,
  getOrganizationDetails,
  removeMember,
  updateOrganizationSubscription,
  getOrganizationMembers,
  getInvitedMembers,
  validateInviteLink,
} from "../controllers/organizationController.js";

const router = express.Router();

// Create new organization
router.post("/create", auth, createOrganization);

// Generate invite link
router.post("/invite", auth, generateInviteLink);

// Validate invite link (public route for checking link validity)
router.get("/validate-invite/:token", validateInviteLink);

// Join organization using invite link
router.post("/join/:token", auth, joinOrganization);

// Get organization details
router.get("/details", auth, getOrganizationDetails);

// Remove member from organization
router.delete("/members/:memberId", auth, removeMember);

// Update organization subscription
router.put("/subscription", auth, updateOrganizationSubscription);

// Get organization members
router.get("/members", auth, getOrganizationMembers);

// Get invited members (pending invitations)
router.get("/invited-members", auth, getInvitedMembers);

export default router;
