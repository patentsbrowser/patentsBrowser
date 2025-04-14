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
      
      // Log the user data from localStorage
      console.log('AuthContext - User from localStorage:', parsedUser);
      console.log('AuthContext - Is admin from localStorage:', parsedUser?.isAdmin);
      
      return parsedUser;
    } catch (error) {
      // Clear potentially corrupted data
      console.error('Error parsing user from localStorage:', error);
      localStorage.removeItem('user');
      return null;
    }
  });

  // When the user state changes, update localStorage
  useEffect(() => {
    if (user) {
      console.log('AuthContext - Updating user in localStorage:', user);
      localStorage.setItem('user', JSON.stringify({
        ...user,
        isAdmin: user.isAdmin === true
      }));
    }
  }, [user]);

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
      }
    } catch (error) {
      // If there's any error, clear the auth state to be safe
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) => authApi.login(credentials),
    onSuccess: (data) => {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
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

  return (
    <AuthContext.Provider value={{ 
      user,
      login: (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
      signup: (credentials) => signupMutation.mutateAsync(credentials),
      logout: () => logoutMutation.mutateAsync(),
      isAuthenticated: !!user,
      setUser,
      checkAuth
    }}>
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