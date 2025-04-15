import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import './Authentication.scss';
import toast from 'react-hot-toast';
import { useAuth } from '../../AuthContext';
import OTPModal from './OTPModal/OTPModal';
import Loader from '../Loader/Loader';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion } from 'framer-motion';

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
        setShowOTPModal(false); // Close the modal after successful verification
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
    try {
      await verifyOTPMutation.mutateAsync(otp);
    } catch (error) {
      // Error is already handled in mutation's onError
      console.error('OTP verification failed:', error);
    }
  };

  const handleResendOTP = async () => {
    await resendOTPMutation.mutateAsync();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      }
    }
  };

  const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring", stiffness: 150, damping: 13 }
    }
  };

  return (
    <>
      <Loader isLoading={signupMutation.isPending || verifyOTPMutation.isPending || resendOTPMutation.isPending} />
      <motion.div 
        className="auth-box"
        initial={{ opacity: 0, rotateY: -30, scale: 0.9 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 15,
          duration: 0.8 
        }}
        whileHover={{ translateZ: 40 }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >Create Account</motion.h2>
        <motion.form 
          onSubmit={handleSubmit}
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="form-group"
            variants={inputVariants}
          >
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
          </motion.div>
          <motion.div 
            className="form-group"
            variants={inputVariants}
          >
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
          </motion.div>
          <motion.div 
            className="form-group"
            variants={inputVariants}
          >
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
              <motion.button 
                type="button" 
                className="password-toggle-btn" 
                onClick={togglePasswordVisibility}
                tabIndex={-1}
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </motion.button>
            </div>
          </motion.div>
          <motion.button 
            type="submit" 
            className="submit-btn"
            disabled={signupMutation.isPending}
            variants={inputVariants}
            whileHover={{ 
              scale: 1.05, 
              y: -5,
              boxShadow: "0 10px 25px rgba(106, 38, 205, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            {signupMutation.isPending ? 'Creating Account...' : 'Create Account'}
          </motion.button>
        </motion.form>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Already have an account?{' '}
          <motion.button 
            className="switch-btn"
            onClick={switchToLogin}
            disabled={signupMutation.isPending}
            whileHover={{ 
              scale: 1.1,
              color: "#ffffff",
              textShadow: "0 0 8px rgba(255, 215, 0, 0.8)" 
            }}
          >
            Sign In
          </motion.button>
        </motion.p>
      </motion.div>

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