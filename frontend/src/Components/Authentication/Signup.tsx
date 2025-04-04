import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import './Authentication.scss';
import toast from 'react-hot-toast';
import { useAuth } from '../../AuthContext';
import OTPModal from './OTPModal/OTPModal';
import Loader from '../Loader/Loader';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Signup = ({ switchToLogin }: { switchToLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (response: any) => {
      console.log('Signup response:', response);
      if (response.statusCode === 200 || response.statusCode === 201) {
        toast.success('Account created! Please verify your email.');
        setIsOTPSent(true);
        setShowOTPModal(true);
      } else if (response.message) {
        // Handle non-error but non-success responses with messages
        toast.error(response.message);
      }
    },
    onError: (error: any) => {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    }
  });

  const verifyOTPMutation = useMutation({
    mutationFn: (otp: string) => authApi.verifyOTP(email, otp),
    onSuccess: (response: any) => {
      if (response.statusCode === 200) {
        toast.success(response.message);
        // Set user state from localStorage
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user) {
          setUser(user);
        }
        switchToLogin();
      } else if (response.message) {
        toast.error(response.message);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Invalid OTP';
      toast.error(errorMessage);
    }
  });

  const resendOTPMutation = useMutation({
    mutationFn: () => authApi.resendOTP(email),
    onSuccess: (response: any) => {
      toast.success(response.message || 'OTP resent successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to resend OTP';
      toast.error(errorMessage);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    signupMutation.mutate({ email, password, name });
  };

  const handleVerifyOTP = async (otp: string) => {
    await verifyOTPMutation.mutateAsync(otp);
  };

  const handleResendOTP = async () => {
    await resendOTPMutation.mutateAsync();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Loader isLoading={signupMutation.isPending || verifyOTPMutation.isPending || resendOTPMutation.isPending} />
      <div className="auth-box">
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              disabled={signupMutation.isPending}
              className="auth-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={signupMutation.isPending}
              className="auth-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                disabled={signupMutation.isPending}
                className="auth-input"
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={togglePasswordVisibility}
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={signupMutation.isPending}
          >
            {signupMutation.isPending ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p>
          Already have an account?{' '}
          <button 
            className="switch-btn"
            onClick={switchToLogin}
            disabled={signupMutation.isPending}
          >
            Sign In
          </button>
        </p>
      </div>

      <OTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        email={email}
        isResendDisabled={resendOTPMutation.isPending}
        mode="signup"
      />
    </>
  );
};

export default Signup; 