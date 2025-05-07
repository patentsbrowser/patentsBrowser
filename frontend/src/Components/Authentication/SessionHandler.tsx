import { useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import axiosInstance from '../../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SessionHandler: React.FC = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Create a response interceptor for session expiration
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle network errors or backend unavailability
        if (!error.response) {
          toast.error('Unable to connect to the server. Please try again later.');
          return Promise.reject(error);
        }

        // Handle auth errors
        if (
          error.response.status === 401 ||
          error.response.status === 403 ||
          (error.response.data?.code === 'SESSION_EXPIRED' || 
           error.response.data?.code === 'INVALID_TOKEN' ||
           error.response.data?.code === 'AUTH_REQUIRED')
        ) {
          // Clear the user state in React context
          setUser(null);
          
          // Clear any stored data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Show error message
          const errorMessage = error.response.data?.message || 'Your session has expired. Please log in again.';
          toast.error(errorMessage);
          
          // Force navigation to login page
          window.location.replace('/');
        }
        return Promise.reject(error);
      }
    );

    // Clean up the interceptor when the component unmounts
    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, [setUser, navigate]);

  // This component doesn't render anything
  return null;
};

export default SessionHandler; 