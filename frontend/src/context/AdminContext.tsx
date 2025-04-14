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
  // Always initialize isAdminMode to false to ensure users start in user mode
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Log user state for debugging
  console.log('AdminContext - User state:', user);
  console.log('AdminContext - Is admin:', user?.isAdmin);
  console.log('AdminContext - Admin mode state:', isAdminMode);
  console.log('AdminContext - Admin check performed:', adminCheckPerformed);

  // Reset admin mode to false when user changes (e.g., on login/logout)
  useEffect(() => {
    // Ensure admin mode is always false initially, even for admin users
    setIsAdminMode(false);
    console.log('AdminContext - Reset admin mode to false on user change');
  }, [user?.id]); // Only reset when user ID changes (login/logout)

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