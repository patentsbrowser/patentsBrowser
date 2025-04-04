import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    try {
      console.log('Attempting login with credentials:', { email: credentials.email, password: '[REDACTED]' });
      const { data } = await axios.post(`${API_URL}/auth/login`, credentials);
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
      const { data } = await axios.post(`${API_URL}/auth/signup`, credentials);
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
      const { data } = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
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
      const { data } = await axios.post(`${API_URL}/auth/resend-otp`, { email });
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
    const token = localStorage.getItem('token');

    const { data } = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },
  updateProfile: async (profileData: any) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(`${API_URL}/auth/update-profile`, profileData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },
  savePatent: async (patentIds: string[], folderName?: string) => {
    const token = localStorage.getItem('token');
    try {
      const { data } = await axios.post(`${API_URL}/saved-patents`, 
        { patentIds, folderName }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return data;
    } catch (error) {
      console.error('Error saving patents:', error);
      throw error;
    }
  },
  saveCustomPatentList: async (name: string, patentIds: string[], source?: string) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Saving custom patent list:', { name, patentIds, token, source });
      
      const response = await axios.post(
        `${API_URL}/saved-patents/save-custom-list`, 
        { name, patentIds, source },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Custom patent list saved response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in saveCustomPatentList:', error);
      throw error;
    }
  },
  getCustomPatentList: async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/saved-patents/custom-list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },
  
  removePatentFromFolder: async (folderId: string, patentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/saved-patents/remove-from-folder`, 
        { folderId, patentId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
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
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/saved-patents/delete-folder`, 
        { folderId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
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
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/saved-patents/create-subfolder`,
        { name, parentFolderId, patentIds },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
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
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/saved-patents/add-to-subfolder`,
        { subfolderId, patentId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Patent added to subfolder response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error adding patent to subfolder:', error);
      throw error;
    }
  },
  
  logout: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    try {
      const { data } = await axios.post(`${API_URL}/auth/logout`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    } catch (error) {
      // Let the component handle the error
      throw error;
    }
  },

  uploadProfileImage: async (file: File) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('profileImage', file);
    
    const { data } = await axios.post(`${API_URL}/auth/upload-image`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },
  
  uploadPatentFile: async (file: File, folderName?: string) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('patentFile', file);
    
    // Add folder name to form data if provided
    if (folderName) {
      formData.append('folderName', folderName);
    }
    
    try {
      const { data } = await axios.post(`${API_URL}/saved-patents/extract-from-file`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return data;
    } catch (error) {
      console.error('Error uploading patent file:', error);
      throw error;
    }
  }
}; 