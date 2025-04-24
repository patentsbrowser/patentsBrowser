import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosConfig';
import './ForgotPassword.scss';

interface ForgotPasswordProps {
  onClose: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onClose }) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axiosInstance.post('/auth/send-otp', { email });
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      toast.error('Please enter both OTP and new password');
      return;
    }
    
    setIsLoading(true);
    try {
      await axiosInstance.post('/auth/reset-password', {
        email,
        otp,
        newPassword
      });
      toast.success('Password reset successful!');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <form onSubmit={handleSendOTP}>
            <h3>Forgot Password</h3>
            <p>Enter your email address to receive a verification code</p>
            <div className="form-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="auth-input"
              />
            </div>
            <motion.button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </motion.button>
          </form>
        );

      case 'otp':
        return (
          <form onSubmit={handleResetPassword}>
            <h3>Reset Password</h3>
            <p>Enter the OTP sent to your email and set a new password</p>
            <div className="form-group">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
                className="auth-input"
              />
            </div>
            <div className="form-group">
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="auth-input"
                />
                <motion.button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </motion.button>
              </div>
            </div>
            <motion.button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </motion.button>
          </form>
        );
    }
  };

  return (
    <motion.div
      className="forgot-password-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div 
        className="modal-content"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 25,
          duration: 0.2
        }}
      >
        <button className="close-btn" onClick={onClose}>×</button>
        {renderStep()}
      </motion.div>
    </motion.div>
  );
};

export default ForgotPassword; 