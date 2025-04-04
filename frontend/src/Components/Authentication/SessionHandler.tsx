import { useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import axiosInstance from '../../api/axiosConfig';

const SessionHandler: React.FC = () => {
  const { setUser } = useAuth();

  useEffect(() => {
    // Create a response interceptor for session expiration
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          error.response && 
          error.response.status === 401 && 
          (error.response.data?.code === 'SESSION_EXPIRED' || 
           error.response.data?.code === 'INVALID_TOKEN')
        ) {
          // Just clear the user state in React context
          // The axios interceptor will handle localStorage clearing and redirection
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    // Clean up the interceptor when the component unmounts
    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, [setUser]);

  // This component doesn't render anything
  return null;
};

export default SessionHandler; 