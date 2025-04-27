import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useMutation } from '@tanstack/react-query';
import { authApi } from './api/auth';

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => boolean;
  checkAdminStatus: () => Promise<void>;
  forceAdminCheck: () => void;
  adminCheckPerformed: boolean;
}

// const API_URL = 'http://localhost:5000/api';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize user from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      // Only parse if savedUser exists and is not "undefined"
      const parsedUser = savedUser && savedUser !== "undefined" ? JSON.parse(savedUser) : null;
      return parsedUser;
    } catch (error) {
      // Clear potentially corrupted data
      localStorage.removeItem('user');
      return null;
    }
  });

  // Check if token exists on component mount
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (!token || !savedUser || savedUser === "undefined") {
        // Clean up any inconsistent state
        if (!token) localStorage.removeItem('user');
        if (!savedUser) localStorage.removeItem('token');
        setUser(null);
      } else {
        // Log the user data on mount
        const parsedUser = JSON.parse(savedUser);
      }
    } catch (error) {
      // If there's any error, clear the auth state to be safe
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  // Add a new state variable to track when admin check has already been performed
  const [adminCheckPerformed, setAdminCheckPerformed] = useState<boolean>(false);

  // Function to check admin status (to be called only once)
  const checkAdminStatus = async () => {
    // Skip if already checked or no user
    if (adminCheckPerformed || !user) return;
    
    // No need to make an API call since we already have the admin status from login
    setAdminCheckPerformed(true);
  };

  // Expose the admin check function
  const forceAdminCheck = () => {
    setAdminCheckPerformed(false);
    checkAdminStatus();
  };

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) => authApi.login(credentials),
    onSuccess: (data) => {
      // Ensure we're storing the complete user object with admin status
      const userData = {
        ...data.user,
        isAdmin: data.user?.isAdmin || false
      };
      
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Set admin check as performed since we have the status from login
      setAdminCheckPerformed(true);
    }
  });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      // Don't set user state here since we need OTP verification first
      return data;
    }
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onMutate: () => {
      // Clear user state immediately when logout is initiated
      setUser(null);
    },
    // No need for onSettled since the api logout function handles everything else
  });

  // Function to check if user is authenticated
  const checkAuth = (): boolean => {
    try {
      const token = localStorage.getItem('token');
      return !!token && !!user && token !== "undefined";
    } catch (error) {
      return false;
    }
  };

  // Add new effect to trigger the admin check when user changes
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        login: (email: string, password: string) => loginMutation.mutateAsync({ email, password }).then(() => {}),
        signup: (credentials) => signupMutation.mutateAsync(credentials).then(() => {}),
        logout: () => logoutMutation.mutateAsync().then(() => {}),
        checkAuth,
        checkAdminStatus,
        forceAdminCheck,
        adminCheckPerformed
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 