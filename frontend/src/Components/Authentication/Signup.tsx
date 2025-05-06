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
import { GoogleLogin as GoogleOAuthLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosConfig';

interface SignupProps {
  switchToLogin?: () => void;
}

const Signup: React.FC<SignupProps> = ({ switchToLogin }) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'organization'>('individual');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOrganization, setIsOrganization] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSize, setOrganizationSize] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const signupMutation = useMutation({
    mutationFn: () => {
      return authApi.signup({
        email,
        password,
        name: fullName,
        isOrganization,
        organizationName: isOrganization ? organizationName : undefined,
        organizationSize: isOrganization ? organizationSize : undefined,
        organizationType: isOrganization ? organizationType : undefined,
      });
    },
    onSuccess: (response) => {
      if (response.statusCode === 200) {
        handleSignupSuccess(response.data);
      } else {
        toast.error(response.message || 'Signup failed. Please try again.');
      }
    },
    onError: (error: any) => {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Signup failed. Please try again.';
      toast.error(errorMessage);
    },
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
        navigate('/auth/dashboard'); // Now navigate after OTP verification
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

  const handleSignupSuccess = (data: any) => {
    toast.success('Account created successfully!');
    setShowOTPModal(true); // Show OTP modal after signup
    // Do not navigate or set user yet
  };

  const handleTabSwitch = (tab: 'individual' | 'organization') => {
    setActiveTab(tab);
    // Optionally reset org fields when switching
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    signupMutation.mutate();
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
          <div className="signup-tabs">
            <button
              className={activeTab === 'individual' ? 'active' : ''}
              onClick={() => handleTabSwitch('individual')}
            >
              Individual
            </button>
            <button
              className={activeTab === 'organization' ? 'active' : ''}
              onClick={() => handleTabSwitch('organization')}
            >
              Organization
            </button>
          </div>
          {activeTab === 'organization' && (
            <>
              <motion.div className="form-group" variants={inputVariants}>
                <label htmlFor="organizationName">Organization Name</label>
                <input
                  type="text"
                  id="organizationName"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Enter organization name"
                  required
                  disabled={signupMutation.isPending}
                  className="auth-input"
                />
              </motion.div>
              <motion.div className="form-group" variants={inputVariants}>
                <label htmlFor="organizationSize">Organization Size</label>
                <select
                  id="organizationSize"
                  value={organizationSize}
                  onChange={(e) => setOrganizationSize(e.target.value)}
                  required
                  disabled={signupMutation.isPending}
                  className="auth-input"
                >
                  <option value="">Select organization size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501+">501+ employees</option>
                </select>
              </motion.div>
              <motion.div className="form-group" variants={inputVariants}>
                <label htmlFor="organizationType">Organization Type</label>
                <select
                  id="organizationType"
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  required
                  disabled={signupMutation.isPending}
                  className="auth-input"
                >
                  <option value="">Select organization type</option>
                  <option value="startup">Startup</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="government">Government</option>
                  <option value="educational">Educational</option>
                  <option value="research">Research Institution</option>
                  <option value="other">Other</option>
                </select>
              </motion.div>
            </>
          )}
          {activeTab === 'individual' && (
            <motion.div 
              className="form-group"
              variants={inputVariants}
            >
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={signupMutation.isPending}
                className="auth-input"
              />
            </motion.div>
          )}
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
                placeholder="Enter your password"
                required
                minLength={6}
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
          <div className="divider">
            <span>Or</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <span>Already have an account? </span>
            <button
              type="button"
              className="switch-btn"
              onClick={typeof switchToLogin === 'function' ? switchToLogin : undefined}
              style={{ background: 'none', border: 'none', color: '#ffd700', cursor: 'pointer', fontWeight: 600 }}
            >
              Sign In
            </button>
          </div>
        </motion.form>
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