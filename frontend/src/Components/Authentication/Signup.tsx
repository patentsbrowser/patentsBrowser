import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../../api/auth';
import Loader from '../Common/Loader';
import OTPModal from './OTPModal/OTPModal';
import toast from 'react-hot-toast';
import './Authentication.scss';

interface SignupProps {
  switchToLogin?: () => void;
}

const Signup: React.FC<SignupProps> = ({ switchToLogin }) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'organization'>('individual');
  const [isOrganization, setIsOrganization] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  
  // Organization fields
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSize, setOrganizationSize] = useState('');
  const [organizationType, setOrganizationType] = useState('');

  const navigate = useNavigate();

  const signupMutation = useMutation({
    mutationFn: (credentials: any) => authApi.signup(credentials),
    onSuccess: (response: any) => {
      if (response.statusCode === 200) {
        setPendingEmail(email);
        setShowOTPModal(true);
        toast.success('OTP sent to your email. Please verify to complete signup.');
      } else {
        toast.error(response.message || 'Signup failed');
      }
    },
    onError: (error: any) => {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Signup failed. Please try again.';
      toast.error(errorMessage);
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: (otp: string) => authApi.verifyOTP(pendingEmail, otp),
    onSuccess: (response: any) => {
      if (response.statusCode === 200) {
        toast.success('Account created successfully!');
        setShowOTPModal(false);
        navigate('/auth/dashboard');
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
    mutationFn: () => authApi.resendOTP(pendingEmail),
    onSuccess: (response: any) => {
      toast.success(response.message || 'OTP resent successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to resend OTP';
      toast.error(errorMessage);
    }
  });

  const handleTabSwitch = (tab: 'individual' | 'organization') => {
    setActiveTab(tab);
    setIsOrganization(tab === 'organization');
    // Reset organization fields when switching to individual
    if (tab === 'individual') {
      setOrganizationName('');
      setOrganizationSize('');
      setOrganizationType('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields based on active tab
    if (activeTab === 'organization') {
      if (!organizationName || !organizationSize || !organizationType) {
        toast.error('Please fill all organization details.');
        return;
      }
    } else {
      if (!fullName) {
        toast.error('Please enter your full name.');
        return;
      }
    }

    if (!email || !password) {
      toast.error('Please fill all required fields.');
      return;
    }

    // Prepare signup credentials
    const credentials = {
      name: fullName,
      email,
      password,
      isOrganization: activeTab === 'organization',
      ...(activeTab === 'organization' && {
        organizationName,
        organizationSize,
        organizationType
      })
    };

    signupMutation.mutate(credentials);
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
      {/* <Loader 
        fullScreen={signupMutation.isPending || verifyOTPMutation.isPending || resendOTPMutation.isPending}
        text="Processing..."
      /> */}
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
              type="button"
              className={activeTab === 'individual' ? 'active' : ''}
              onClick={() => handleTabSwitch('individual')}
            >
              Individual
            </button>
            <button
              type="button"
              className={activeTab === 'organization' ? 'active' : ''}
              onClick={() => handleTabSwitch('organization')}
            >
              Organization
            </button>
          </div>
          
          {activeTab === 'organization' && (
            <>
              <motion.div className="form-group" variants={inputVariants}>
                <label htmlFor="organizationName">Organization Name *</label>
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
                <label htmlFor="organizationSize">Organization Size *</label>
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
                <label htmlFor="organizationType">Organization Type *</label>
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
              <label htmlFor="name">Full Name *</label>
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
            <label htmlFor="email">Email Address *</label>
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
            <label htmlFor="password">Password *</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={signupMutation.isPending}
                className="auth-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={signupMutation.isPending}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </motion.div>
          
          <motion.button
            type="submit"
            className="auth-button"
            variants={inputVariants}
            disabled={signupMutation.isPending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {signupMutation.isPending ? 'Creating Account...' : 'Create Account'}
          </motion.button>
        </motion.form>
        
        <motion.div 
          className="auth-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>
            Already have an account?{' '}
            <button 
              type="button"
              className="link-button" 
              onClick={switchToLogin}
              disabled={signupMutation.isPending}
            >
              Login here
            </button>
          </p>
        </motion.div>
      </motion.div>

      {showOTPModal && (
        <OTPModal
          isOpen={showOTPModal}
          onClose={() => setShowOTPModal(false)}
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
          email={pendingEmail}
          isResendDisabled={resendOTPMutation.isPending}
          mode="signup"
        />
      )}
    </>
  );
};

export default Signup; 