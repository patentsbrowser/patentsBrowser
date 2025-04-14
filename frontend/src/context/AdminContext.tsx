import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "../AuthContext";

interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  setAdminMode: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, adminCheckPerformed } = useAuth();
  // Initialize isAdminMode to true for admin users, false for regular users
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Log user state for debugging
  console.log('AdminContext - User state:', user);
  console.log('AdminContext - Is admin:', user?.isAdmin);
  console.log('AdminContext - Admin mode state:', isAdminMode);
  console.log('AdminContext - Admin check performed:', adminCheckPerformed);

  // Update admin mode when user info changes or admin status changes
  useEffect(() => {
    if (user?.isAdmin) {
      // Set admin mode to true by default for admin users
      setIsAdminMode(true);
      console.log('AdminContext - Setting admin mode to true for admin user');
    } else {
      // Reset to false for non-admin users
      setIsAdminMode(false);
      console.log('AdminContext - Reset admin mode to false for non-admin user');
    }
  }, [user?.id, user?.isAdmin]); // Update when user ID or admin status changes

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