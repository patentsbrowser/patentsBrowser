import React, { useState, useEffect } from 'react';
import Modal from '../../Modal/Modal';
import OTPInput from 'otp-input-react';
import './OTPModal.scss';
import toast from 'react-hot-toast';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  email: string;
  isResendDisabled?: boolean;
  mode?: 'signup' | 'signin';
}

const OTPModal: React.FC<OTPModalProps> = ({ 
  isOpen, 
  onClose, 
  onVerify, 
  onResend,
  email,
  isResendDisabled,
  mode = 'signup'
}) => {
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60); // 60 seconds (1 minute)
  const [canResend, setCanResend] = useState(false);

  // Reset timer and start countdown when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimer(60); // 60 seconds (1 minute)
      setCanResend(false);
      setOtp(''); // Reset OTP when modal opens
    }
  }, [isOpen]);

  // Handle timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setCanResend(true);
          }
          return newValue;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer, isOpen]);

  const handleResendOTP = async () => {
    try {
      setCanResend(false);
      await onResend();
      setTimer(60); // Reset to 60 seconds
      setOtp('');
      toast.success('OTP resent successfully');
    } catch (error) {
      setCanResend(true);
      toast.error('Failed to resend OTP');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    try {
      await onVerify(otp);
      onClose();
    } catch (error) {
      toast.error('Invalid OTP. Please try again.');
    }
  };

  if (!isOpen) return null;

  // Mask email for privacy
  const maskedEmail = email.replace(/(.{3})(.*)(@.*)/, '$1****$3');

  return (
    <Modal 
      onClose={onClose}
      title={mode === 'signup' ? 'Verify Your Email' : 'Verify Your Login'}
    >
      <div className="otp-modal">
        <h2>{mode === 'signup' ? 'Verify Your Email' : 'Verify Your Login'}</h2>
        <div className="otp-instructions">
          A verification code has been sent to <strong>{maskedEmail}</strong>. 
          {mode === 'signup' 
            ? ' Please enter the 6-digit code to complete your registration and secure your account.'
            : ' Please enter the 6-digit code to verify your identity and access your account.'}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="otp-input-container">
            <OTPInput
              value={otp}
              onChange={setOtp}
              autoFocus
              OTPLength={6}
              otpType="number"
              disabled={false}
              inputClassName="otp-input"
              secure={false}
              renderInput={(props) => <input {...props} />}
            />
          </div>
          <button type="submit" className="otp-button">
            {mode === 'signup' ? 'Verify & Complete Signup' : 'Verify & Login'}
          </button>
        </form>
        <div className="resend-section">
          <p>Didn't receive the code?</p>
          <button 
            onClick={handleResendOTP} 
            disabled={isResendDisabled || !canResend}
            className={`resend-btn ${timer > 0 ? 'disabled' : 'active'}`}
          >
            {timer > 0 ? (
              <span>
                Resend code in <span className="countdown">{timer}s</span>
              </span>
            ) : (
              <span className="resend-now">Resend code now</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default OTPModal; 