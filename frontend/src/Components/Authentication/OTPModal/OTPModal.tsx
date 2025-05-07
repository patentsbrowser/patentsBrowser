import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './OTPModal.scss';
import { motion, AnimatePresence } from 'framer-motion';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => void;
  onResend: () => void;
  email: string;
  isResendDisabled: boolean;
  mode: 'signup' | 'forgotPassword';
}

const OTPModal: React.FC<OTPModalProps> = ({ 
  isOpen, 
  onClose, 
  onVerify, 
  onResend, 
  email,
  isResendDisabled,
  mode
}) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    
    // Make sure we only accept numbers
    if (!/^[0-9]*$/.test(value)) return;
    
    // Update the OTP array
    const newOtp = [...otp];
    newOtp[index] = value.substring(0, 1); // Only take first character
    setOtp(newOtp);
    
    // Auto-focus next input if value is set
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    // Handle backspace and move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    // Check if pasted content is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      
      // Focus on the last input
      inputRefs.current[5]?.focus();
    }
  };
  
  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp(Array(6).fill(''));
      setIsVerifying(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [isOpen]);
  
  // Submit OTP when all digits are filled
  useEffect(() => {
    if (otp.every(digit => digit !== '') && !isVerifying) {
      // All digits filled and not already verifying
      const otpString = otp.join('');
      // Submit after a small delay to let the user see the last digit
      setIsVerifying(true);
      setTimeout(() => {
        onVerify(otpString);
      }, 300);
    }
  }, [otp, onVerify, isVerifying]);
  
  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
  
  // Create portal root if it doesn't exist
  useEffect(() => {
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    setPortalRoot(root);

    return () => {
      if (root && !root.hasChildNodes()) {
        root.remove();
      }
    };
  }, []);
  
  // Debug log to check modal state
  useEffect(() => {
    console.log('OTPModal state:', { isOpen, portalRoot, email });
  }, [isOpen, portalRoot, email]);
  
  if (!isOpen || !portalRoot) {
    console.log('OTPModal not rendering:', { isOpen, portalRoot });
    return null;
  }
  
  const modalTitle = mode === 'signup' 
    ? 'Verify Your Email' 
    : 'Reset Your Password';
  
  const instruction = mode === 'signup'
    ? `We've sent a 6-digit verification code to <strong>${email}</strong>. Please enter it below to confirm your email.`
    : `Enter the 6-digit code sent to <strong>${email}</strong> to reset your password.`;
  
  const modalContent = (
    <AnimatePresence mode="wait">
      <motion.div 
        className="otp-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="otp-modal"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          onClick={e => e.stopPropagation()}
        >
          <motion.h3
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {modalTitle}
          </motion.h3>
          
          <motion.p 
            className="otp-instructions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            dangerouslySetInnerHTML={{ __html: instruction }}
          />
          
          <div className="otp-input-container">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <motion.input
                key={index}
                type="text"
                maxLength={1}
                value={otp[index]}
                onChange={(e) => handleInputChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={index === 0 ? handlePaste : undefined}
                ref={(el) => inputRefs.current[index] = el}
                className="otp-input"
                required
                autoComplete="off"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { 
                    delay: 0.4 + (index * 0.05),
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }
                }}
              />
            ))}
          </div>
          
          <motion.div
            className="resend-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p>
              Didn't receive the code?{' '}
              <motion.button
                className="resend-btn"
                onClick={onResend}
                disabled={isResendDisabled}
                whileHover={{ 
                  scale: 1.05, 
                  color: "#ffffff",
                  textShadow: "0 0 8px rgba(255, 215, 0, 0.8)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                Resend
              </motion.button>
            </p>
          </motion.div>
          
          <motion.button
            className="close-btn"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.8 }}
            whileHover={{ 
              opacity: 1,
              scale: 1.1,
              rotate: 5
            }}
            whileTap={{ scale: 0.9 }}
          >
            ×
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modalContent, portalRoot);
};

export default OTPModal; 