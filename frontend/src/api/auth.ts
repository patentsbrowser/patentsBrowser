import api from './axiosConfig';

// Request-specific locks to prevent race conditions
const verificationLocks = new Map<string, Promise<any>>();

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
}

export const authApi = {
  // Check if user is admin
  checkAdminStatus: async () => {
    try {
      const { data } = await api.get('/auth/profile');
      return {
        isAdmin: data.data?.isAdmin || false,
        statusCode: 200
      };
    } catch (error: any) {
      console.error('Error checking admin status:', error);
      return {
        isAdmin: false,
        statusCode: error.response?.status || 500,
        error: error.message
      };
    }
  },

  signup: async (credentials: SignupCredentials & {
    isOrganization?: boolean;
    organizationName?: string;
    organizationSize?: string;
    organizationType?: string;
  }) => {
    try {
      const { data } = await api.post('/auth/signup', credentials);
      return data;
    } catch (error: any) {
      console.error('Signup error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  login: async (credentials: LoginCredentials) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      if (data.statusCode === 200 && data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
      return data;
    } catch (error: any) {
      console.error('Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { statusCode: 200, message: 'Logged out successfully' };
    } catch (error: any) {
      console.error('Logout error:', error);
      // Clear local storage even if API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const { data } = await api.get('/auth/profile');
      return data;
    } catch (error: any) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  updateProfile: async (profileData: any) => {
    try {
      const { data } = await api.post('/auth/update-profile', profileData);
      return data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // uploadProfileImage: async (file: File) => {
  //   try {
  //     const formData = new FormData();
  //     formData.append('profileImage', file);
  //     const { data } = await api.post('/auth/upload-image', formData, {
  //       headers: { 'Content-Type': 'multipart/form-data' }
  //     });
  //     return data;
  //   } catch (error: any) {
  //     console.error('Upload profile image error:', error);
  //     throw error;
  //   }
  // },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return data;
    } catch (error: any) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  sendOTP: async (email: string) => {
    try {
      const { data } = await api.post('/auth/send-otp', { email });
      return data;
    } catch (error: any) {
      console.error('Send OTP error:', error);
      throw error;
    }
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    try {
      const { data } = await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword
      });
      return data;
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  verifyOTP: async (email: string, otp: string) => {
    // Use request-specific lock to prevent race conditions
    const lockKey = `${email}-${otp}`;
    
    if (verificationLocks.has(lockKey)) {
      return verificationLocks.get(lockKey);
    }
    
    const verificationPromise = (async () => {
      try {
      const { data } = await api.post(`/auth/verify-otp`, { email, otp });
        if (data.statusCode === 200 && data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
      return data;
    } catch (error: any) {
      console.error('OTP verification error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    } finally {
        // Remove the lock after a delay to prevent immediate reuse
      setTimeout(() => {
          verificationLocks.delete(lockKey);
        }, 1000);
    }
    })();
    
    verificationLocks.set(lockKey, verificationPromise);
    return verificationPromise;
  },

  resendOTP: async (email: string) => {
    try {
      const { data } = await api.post(`/auth/resend-otp`, { email });
      return data;
    } catch (error: any) {
      console.error('Resend OTP error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  savePatent: async (patentIds: string[], folderName?: string) => {
    try {
      const { data } = await api.post(`/saved-patents`, 
        { patentIds, folderName }
      );
      return data;
    } catch (error) {
      console.error('Error saving patents:', error);
      throw error;
    }
  },
  
  saveCustomPatentList: async (name: string, patentIds: string[], source?: string, workFileName?: string) => {
    try {
      const response = await api.post(
        `/saved-patents/save-custom-list`, 
        { name, patentIds, source, workFileName }
      );
      return response.data;
    } catch (error) {
      console.error('Error in saveCustomPatentList:', error);
      throw error;
    }
  },
  
  getCustomPatentList: async () => {
    const { data } = await api.get(`/saved-patents/custom-list`);
    return data;
  },
  
  removePatentFromFolder: async (folderId: string, patentId: string) => {
    try {
      const response = await api.post(
        `/saved-patents/remove-from-folder`, 
        { folderId, patentId }
      );
      return response.data;
    } catch (error) {
      console.error('Error removing patent from folder:', error);
      throw error;
    }
  },
  
  deleteFolder: async (folderId: string) => {
    try {
      const response = await api.post(
        `/saved-patents/delete-folder`, 
        { folderId }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  },
  
  createSubfolder: async (name: string, parentFolderId: string, patentIds: string[] = []) => {
    try {
      const response = await api.post(
        `/saved-patents/create-subfolder`,
        { name, parentFolderId, patentIds }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating subfolder:', error);
      throw error;
    }
  },
  
  addPatentToSubfolder: async (subfolderId: string, patentId: string) => {
    try {
      const response = await api.post(
        `/saved-patents/add-to-subfolder`,
        { subfolderId, patentId }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding patent to subfolder:', error);
      throw error;
    }
  },
  
  addPatentToFolder: async (folderId: string, patentId: string) => {
    try {
      const response = await api.post(
        `/saved-patents/add-to-folder`,
        { folderId, patentId }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding patent to folder:', error);
      throw error;
    }
  },
  
  addPatentsToFolder: async (folderId: string, patentIds: string[]) => {
    try {
      const response = await api.post(
        `/saved-patents/add-patents-to-folder`,
        { folderId, patentIds }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding patents to folder:', error);
      throw error;
    }
  },

  uploadProfileImage: async (file: File) => {
    const formData = new FormData();
    formData.append('profileImage', file);
    
    const { data } = await api.post(`/auth/upload-image`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },
  
  uploadPatentFile: async (file: File, folderName?: string) => {
    const formData = new FormData();
    formData.append('patentFile', file);
    
    // Add folder name to form data if provided
    if (folderName) {
      formData.append('folderName', folderName);
    }
    
    try {
      const { data } = await api.post(`/saved-patents/extract-from-file`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });
      return data;
    } catch (error) {
      console.error('Error uploading patent file:', error);
      throw error;
    }
  },

  getImportedLists: async () => {
    try {
      const response = await api.get(`/saved-patents/get-imported-lists`);
      return response.data;
    } catch (error) {
      console.error('Error getting imported lists:', error);
      throw error;
    }
  },

  mergeWorkFiles: async (workFileIds: string[], newWorkFileName: string) => {
    try {
      const response = await api.post(`/saved-patents/merge-workfiles`, {
        workFileIds,
        newWorkFileName
      });
      return response.data;
    } catch (error) {
      console.error('Error merging work files:', error);
      throw error;
    }
  },

  // Organization signup with invite
  signupWithInvite: async (credentials: SignupCredentials & { inviteToken: string }) => {
    try {
      const { data } = await api.post('/auth/signup-with-invite', credentials);
      return data;
    } catch (error: any) {
      console.error('Organization signup error:', error);
      throw error;
    }
  }
}; 