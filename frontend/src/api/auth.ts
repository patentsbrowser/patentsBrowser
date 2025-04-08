import axiosInstance from './axiosConfig';

const API_URL = import.meta.env.VITE_API_URL;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
}

// Flag to prevent multiple logout calls
let isLoggingOut = false;

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    try {
      console.log('Attempting login with credentials:', { email: credentials.email, password: '[REDACTED]' });
      const { data } = await axiosInstance.post(`/auth/login`, credentials);
      console.log('Login response:', data);
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
  
  signup: async (credentials: SignupCredentials) => {
    try {
      console.log('Attempting signup with credentials:', { ...credentials, password: '[REDACTED]' });
      const { data } = await axiosInstance.post(`/auth/signup`, credentials);
      console.log('Signup response:', data);
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

  verifyOTP: async (email: string, otp: string) => {
    try {
      console.log('Verifying OTP for email:', email);
      const { data } = await axiosInstance.post(`/auth/verify-otp`, { email, otp });
      console.log('OTP verification response:', data);
      if (data.statusCode === 200) {
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
    }
  },

  resendOTP: async (email: string) => {
    try {
      console.log('Resending OTP for email:', email);
      const { data } = await axiosInstance.post(`/auth/resend-otp`, { email });
      console.log('Resend OTP response:', data);
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

  getProfile: async () => {
    const { data } = await axiosInstance.get(`/auth/profile`);
    return data;
  },
  
  updateProfile: async (profileData: any) => {
    const { data } = await axiosInstance.post(`/auth/update-profile`, profileData);
    return data;
  },
  
  savePatent: async (patentIds: string[], folderName?: string) => {
    try {
      const { data } = await axiosInstance.post(`/saved-patents`, 
        { patentIds, folderName }
      );
      return data;
    } catch (error) {
      console.error('Error saving patents:', error);
      throw error;
    }
  },
  
  saveCustomPatentList: async (name: string, patentIds: string[], source?: string) => {
    try {
      console.log('Saving custom patent list:', { name, patentIds, source });
      
      const response = await axiosInstance.post(
        `/saved-patents/save-custom-list`, 
        { name, patentIds, source }
      );
      
      console.log('Custom patent list saved response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in saveCustomPatentList:', error);
      throw error;
    }
  },
  
  getCustomPatentList: async () => {
    const { data } = await axiosInstance.get(`/saved-patents/custom-list`);
    return data;
  },
  
  removePatentFromFolder: async (folderId: string, patentId: string) => {
    try {
      const response = await axiosInstance.post(
        `/saved-patents/remove-from-folder`, 
        { folderId, patentId }
      );
      
      console.log('Patent removed from folder response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error removing patent from folder:', error);
      throw error;
    }
  },
  
  deleteFolder: async (folderId: string) => {
    try {
      const response = await axiosInstance.post(
        `/saved-patents/delete-folder`, 
        { folderId }
      );
      
      console.log('Folder deletion response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  },
  
  createSubfolder: async (name: string, parentFolderId: string, patentIds: string[] = []) => {
    try {
      const response = await axiosInstance.post(
        `/saved-patents/create-subfolder`,
        { name, parentFolderId, patentIds }
      );
      
      console.log('Subfolder creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating subfolder:', error);
      throw error;
    }
  },
  
  addPatentToSubfolder: async (subfolderId: string, patentId: string) => {
    try {
      const response = await axiosInstance.post(
        `/saved-patents/add-to-subfolder`,
        { subfolderId, patentId }
      );
      
      console.log('Patent added to subfolder response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error adding patent to subfolder:', error);
      throw error;
    }
  },
  
  logout: async () => {
    // Prevent multiple logout calls
    if (isLoggingOut) {
      return { message: 'Logout already in progress' };
    }
    
    isLoggingOut = true;
    
    try {
      const { data } = await axiosInstance.post(`/auth/logout`);
      // Clear local storage on logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Navigate to login page
      window.location.href = '/';
      
      return data;
    } catch (error) {
      // Still clear local storage even if the server request fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Navigate to login page even if there's an error
      window.location.href = '/';
      
      // Reset the flag (though this code won't execute due to page navigation)
      isLoggingOut = false;
      
      // Let the component handle the error
      throw error;
    }
  },

  uploadProfileImage: async (file: File) => {
    const formData = new FormData();
    formData.append('profileImage', file);
    
    const { data } = await axiosInstance.post(`/auth/upload-image`, formData, {
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
      const { data } = await axiosInstance.post(`/saved-patents/extract-from-file`, formData, {
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
      const response = await axiosInstance.get(`${API_URL}/saved-patents/get-imported-lists`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching imported lists:', error);
      throw error;
    }
  },

  // Patent search history methods
  getSearchHistory: async () => {
    try {
      const response = await axiosInstance.get(`/saved-patents/search-history`);
      return response.data;
    } catch (error) {
      console.error('Error fetching search history:', error);
      throw error;
    }
  },

  clearSearchHistory: async () => {
    try {
      const response = await axiosInstance.delete(`/saved-patents/search-history`);
      return response.data;
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw error;
    }
  },

  addToSearchHistory: async (patentId: string, source?: string) => {
    try {
      const response = await axiosInstance.post(`/saved-patents/search-history`, { 
        patentId, 
        source 
      });
      return response.data;
    } catch (error) {
      console.error('Error adding to search history:', error);
      throw error;
    }
  }
}; 