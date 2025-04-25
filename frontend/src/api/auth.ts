import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create an axios instance
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
}
// Add a request lock
let isVerifyingOTP = false;

// Auth API functions
export const authApi = {
  // Login function
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      console.log('Login API response:', response.data);
      
      // If login is successful, save the token
      if (response.data.statusCode === 200) {
        localStorage.setItem('token', response.data.data.token);
        const user = response.data.data.user;
        console.log('User data from login:', user);
        console.log('Admin status from login:', user.isAdmin);
        
        // Set the user in localStorage (for persistence)
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return {
        data: response.data.data,
        user: response.data.data.user,
        message: response.data.message,
        statusCode: response.data.statusCode
      };
    } catch (error: any) {
      console.error('Login API error:', error);
      const errorResponse = error.response?.data || { statusCode: 500, message: 'Server error' };
      return {
        data: null,
        user: null,
        message: errorResponse.message,
        statusCode: errorResponse.statusCode
      };
    }
  },

  // Signup function
  signup: async (credentials: any) => {
    try {
      const response = await api.post('/auth/signup', credentials);
      
      return {
        data: response.data.data,
        message: response.data.message,
        statusCode: response.data.statusCode
      };
    } catch (error: any) {
      const errorResponse = error.response?.data || { statusCode: 500, message: 'Server error' };
      return {
        data: null,
        message: errorResponse.message,
        statusCode: errorResponse.statusCode
      };
    }
  },

  // Logout function
  logout: async () => {
    try {
      await api.post('/auth/logout');
      
      // Clear local storage on logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return {
        success: true
      };
    } catch (error) {
      // Still clear local storage on failed logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return {
        success: false,
        error
      };
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error: any) {
      return {
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || 'Failed to fetch profile',
        data: null
      };
    }
  },

  // Update user profile
  updateProfile: async (data: any) => {
    try {
      const response = await api.post('/auth/update-profile', data);
      return response.data;
    } catch (error: any) {
      return {
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || 'Failed to update profile',
        data: null
      };
    }
  },

  // Check admin status - a helper function to check if user is admin
  checkAdminStatus: async () => {
    try {
      const response = await api.get('/auth/check-admin');
      return {
        isAdmin: response.data.isAdmin,
        statusCode: response.data.statusCode
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

  verifyOTP: async (email: string, otp: string) => {
    // Prevent duplicate verifyOTP requests
    if (isVerifyingOTP) {
      return { statusCode: 100, message: 'Request in progress' };
    }
    
    try {
      isVerifyingOTP = true;
      const { data } = await api.post(`/auth/verify-otp`, { email, otp });
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
    } finally {
      // Reset the lock regardless of success or failure
      setTimeout(() => {
        isVerifyingOTP = false;
      }, 500);
    }
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
  
  saveCustomPatentList: async (name: string, patentIds: string[], source?: string) => {
    try {
      const response = await api.post(
        `/saved-patents/save-custom-list`, 
        { name, patentIds, source }
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
      console.error('Error fetching imported lists:', error);
      throw error;
    }
  },

  addPatentsToWorkFile: async (folderId: string, workFileName: string, patentIds: string[]) => {
    try {
      const response = await api.post(
        `/saved-patents/add-patents-to-workfile`,
        { folderId, workFileName, patentIds }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding patents to work file:', error);
      throw error;
    }
  },

  // Patent search history methods
  getSearchHistory: async (params?: {
    limit?: number;
    page?: number;
    source?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
  }) => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.source) queryParams.append('source', params.source);
        if (params.sort) queryParams.append('sort', params.sort);
        if (params.order) queryParams.append('order', params.order);
        if (params.search) queryParams.append('search', params.search);
      }
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await api.get(`/saved-patents/search-history${queryString}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting search history:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  clearSearchHistory: async () => {
    try {
      const response = await api.delete(`/saved-patents/search-history`);
      return response.data;
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw error;
    }
  },

  addToSearchHistory: async (patentId: string, source?: string) => {
    try {
      const response = await api.post(`/saved-patents/search-history`, { 
        patentId, 
        source 
      });
      return response.data;
    } catch (error: any) {
      console.error('Error adding to search history:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      throw error;
    }
  },

  deleteItem: async (params: { itemType: 'folder' | 'workfile' | 'patent', folderId: string, workFileId?: string, patentId?: string }) => {
    const response = await axios.post(`${baseURL}/saved-patents/delete-item`, params, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response;
  },

  // Change password function
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    try {
      const response = await api.post('/auth/change-password', data);
      return response.data;
    } catch (error: any) {
      return {
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || 'Failed to change password',
        data: null
      };
    }
  },

  // Remove patent read status APIs
  // getReadPatents: () => axios.get(`${API_URL}/patent-read-status/list`),
  // markPatentAsRead: (patentId: string) => axios.post(`${API_URL}/patent-read-status/mark-read`, { patentId }),
  // checkPatentsReadStatus: (patentIds: string[]) => axios.post(`${API_URL}/patent-read-status/check-status`, { patentIds }),
}; 