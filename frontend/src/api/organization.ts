import api from './axiosConfig';

export interface OrganizationMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  status?: 'active' | 'pending' | 'inactive';
  userType?: string;
}

export interface InvitedMember {
  token: string;
  createdAt: string;
  expiresAt: string;
  inviteLink: string;
  status: 'pending';
}

export interface OrganizationData {
  name: string;
  size: string;
  type: string;
}

export const organizationApi = {
  // Get organization members
  getMembers: async () => {
    const { data } = await api.get('/organization/members');
    return data;
  },

  // Get invited members
  getInvitedMembers: async () => {
    const { data } = await api.get('/organization/invited-members');
    return data;
  },

  // Generate invite link
  generateInviteLink: async () => {
    const { data } = await api.post('/organization/invite');
    return data;
  },

  // Create organization
  createOrganization: async (organizationData: OrganizationData) => {
    const { data } = await api.post('/organization/create', organizationData);
    return data;
  },

  // Remove member from organization
  removeMember: async (memberId: string) => {
    const { data } = await api.post('/organization/remove-member', { memberId });
    return data;
  }
}; 