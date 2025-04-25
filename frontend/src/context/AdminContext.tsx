import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  setAdminMode: (value: boolean) => void;
}

// Create the context
const AdminContext = createContext<AdminContextType | null>(null);

// Create the provider component
function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdminMode, setIsAdminMode] = useState(false);

  const toggleAdminMode = () => setIsAdminMode(prev => !prev);
  const setAdminMode = (value: boolean) => setIsAdminMode(value);

  return (
    <AdminContext.Provider value={{ isAdminMode, toggleAdminMode, setAdminMode }}>
      {children}
    </AdminContext.Provider>
  );
}

// Create the hook
function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}

// Export everything together
export { AdminProvider, useAdmin }; 