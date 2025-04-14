import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "../AuthContext";

interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  setAdminMode: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, setUser } = useAuth();
  // Always initialize isAdminMode to false to ensure users start in user mode
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Log user state for debugging
  console.log('AdminContext - User state:', user);
  console.log('AdminContext - Is admin:', user?.isAdmin);
  console.log('AdminContext - Admin mode state:', isAdminMode);

  // Reset admin mode to false when user changes (e.g., on login/logout)
  useEffect(() => {
    // Ensure admin mode is always false initially, even for admin users
    setIsAdminMode(false);
    console.log('AdminContext - Reset admin mode to false on user change');
  }, [user?.id]); // Only reset when user ID changes (login/logout)

  // Check admin status from API
  useEffect(() => {
    const checkAdminStatusFromAPI = async () => {
      try {
        setIsLoading(true);
        console.log('AdminContext - Starting API admin check');
        
        // First try: Check if user already has isAdmin flag
        if (user?.isAdmin) {
          console.log('AdminContext - User already has isAdmin flag:', user.isAdmin);
          return;
        }
        
        // Second try: Check admin API endpoint
        try {
          const { authApi } = await import('../api/auth');
          const result = await authApi.checkAdminStatus();
          console.log('AdminContext - API admin check result:', result);
          
          if (result.isAdmin) {
            // Update localStorage and user state if the API confirms admin status
            try {
              const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
              console.log('AdminContext - Stored user after API check:', storedUser);
              
              storedUser.isAdmin = true;
              localStorage.setItem('user', JSON.stringify(storedUser));
              console.log('AdminContext - Updated user in localStorage with isAdmin=true');
              
              setUser({...storedUser});
              console.log('AdminContext - Updated user state with admin=true');
            } catch (error) {
              console.error('Error parsing user from localStorage:', error);
            }
            return;
          }
        } catch (adminCheckError) {
          console.error('Error in admin check API call:', adminCheckError);
        }
        
        // Third try: Try getting profile as a fallback
        try {
          console.log('AdminContext - Attempting profile check as fallback');
          const { authApi } = await import('../api/auth');
          const profileResponse = await authApi.getProfile();
          console.log('AdminContext - Profile check response:', profileResponse);
          
          if (profileResponse?.statusCode === 200 && 
              profileResponse?.data?.isAdmin) {
            
            console.log('AdminContext - Profile check confirms user is admin');
            // Update localStorage with admin status
            try {
              const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
              storedUser.isAdmin = true;
              localStorage.setItem('user', JSON.stringify(storedUser));
              console.log('AdminContext - Updated user in localStorage with isAdmin=true from profile');
              
              setUser({...storedUser});
              console.log('AdminContext - Updated user state with admin=true from profile');
            } catch (error) {
              console.error('Error updating localStorage with admin status:', error);
            }
          }
        } catch (profileError) {
          console.error('Error getting profile as admin check fallback:', profileError);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      checkAdminStatusFromAPI();
    }
  }, [user, setUser]);

  const toggleAdminMode = () => {
    console.log('AdminContext - Toggling admin mode from', isAdminMode, 'to', !isAdminMode);
    setIsAdminMode(prev => !prev);
  };

  // Direct setter for admin mode
  const setAdminMode = (value: boolean) => {
    console.log('AdminContext - Setting admin mode to:', value);
    setIsAdminMode(value);
  };

  return (
    <AdminContext.Provider value={{ 
      isAdminMode,
      toggleAdminMode,
      setAdminMode
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}; 