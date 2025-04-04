import { createContext, useContext, useState, ReactNode } from "react";
import { useMutation } from '@tanstack/react-query';
import { authApi } from './api/auth';

interface User {
  id: string;
  email: string;
  name: string;
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
}

// const API_URL = 'http://localhost:5000/api';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

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

  const logoutMutation:any = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    },
  });

  return (
    <AuthContext.Provider value={{ 
      user,
      login: (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
      signup: (credentials) => signupMutation.mutateAsync(credentials),
      logout: () => logoutMutation.mutateAsync(),
      isAuthenticated: !!user,
      setUser
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