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

  // Update admin mode when user info changes or admin status changes
  useEffect(() => {
    if (user?.isAdmin) {
      // Set admin mode to true by default for admin users
      setIsAdminMode(true);
    } else {
      // Reset to false for non-admin users
      setIsAdminMode(false);

    }
  }, [user?.id, user?.isAdmin]); // Update when user ID or admin status changes

  const toggleAdminMode = () => {

    setIsAdminMode(prev => !prev);
  };

  // Direct setter for admin mode
  const setAdminMode = (value: boolean) => {
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