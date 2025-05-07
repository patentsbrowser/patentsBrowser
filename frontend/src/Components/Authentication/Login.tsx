import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../AuthContext";
import { useNavigate } from "react-router-dom";
import "./Authentication.scss";
import toast from "react-hot-toast";
import Loader from "../Loader/Loader";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { authApi } from "../../api/auth";
import { motion } from "framer-motion";
import { GoogleLogin as GoogleOAuthLogin } from "@react-oauth/google";
import axiosInstance from "../../api/axiosConfig";
import ForgotPassword from "./ForgotPassword";
import OTPModal from "./OTPModal/OTPModal";

const Login = ({ switchToSignup }: { switchToSignup: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [tempUserId, setTempUserId] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { setUser, forceAdminCheck } = useAuth();
  const navigate = useNavigate();
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => {
      return authApi.login({ email, password });
    },
    onSuccess: (response) => {
      if (response.statusCode === 200 && response.data?.mode === 'verify') {
        setPendingEmail(email);
        setShowOTPModal(true);
        return;
      }
      if (response.statusCode === 200) {
        handleLoginSuccess(response.data);
      } else if (response.data?.mode === 'signup') {
        toast.error('Account not found. Please sign up.');
      } else if (response.data?.mode === 'login') {
        toast.error('Account already exists. Please login.');
      } else {
        toast.error(response.message || "Login failed. Please check your credentials.");
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: (otp: string) => authApi.verifyOTP(pendingEmail, otp),
    onSuccess: (response: any) => {
      if (response.statusCode === 200) {
        toast.success('Email verified successfully! Please login again.');
        setShowOTPModal(false);
        setEmail('');
        setPassword('');
      } else {
        toast.error(response.message || 'Verification failed');
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
      toast.success('New OTP sent to your email!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to resend OTP';
      toast.error(errorMessage);
    }
  });

  const handleLoginSuccess = (data: any) => {
    toast.success("Login successful!");
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);

    setTimeout(() => {
      forceAdminCheck();
    }, 500);

    navigate("/auth/dashboard");
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await axiosInstance.post("/auth/google-login", {
        token: credentialResponse.credential,
      });

      const { token, user, isNewUser } = response.data;
      localStorage.setItem("token", token);

      if (user.needsPasswordSetup) {
        setTempUserId(user.id);
        setShowPasswordSetup(true);
      } else {
        handleLoginSuccess({ token, user });
      }
    } catch (error) {
      console.error("Google login failed:", error);
      toast.error("Failed to login with Google. Please try again.");
    }
  };

  const handlePasswordSetup = async (newPassword: string) => {
    try {
      await axiosInstance.post("/auth/set-password", {
        userId: tempUserId,
        password: newPassword,
      });

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.needsPasswordSetup = false;
      localStorage.setItem("user", JSON.stringify(user));

      handleLoginSuccess({
        token: localStorage.getItem("token"),
        user,
      });
    } catch (error) {
      console.error("Error setting password:", error);
      toast.error("Failed to set password. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
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
      },
    },
  };

  const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 150, damping: 13 },
    },
  };

  if (showPasswordSetup) {
    return (
      <motion.div
        className="set-password-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="modal-content"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
        >
          <h2>Set Your Password</h2>
          <p>Please set a password for your account to continue using the application</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password.length < 6) {
                toast.error("Password must be at least 6 characters long");
                return;
              }
              handlePasswordSetup(password);
            }}
          >
            <div className="form-group">
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
            </div>

            <motion.button
              type="submit"
              className="submit-btn"
              whileHover={{
                scale: 1.05,
                y: -5,
                boxShadow: "0 10px 25px rgba(106, 38, 205, 0.4)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              Set Password
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <>
      <Loader isLoading={loginMutation.isPending || verifyOTPMutation.isPending || resendOTPMutation.isPending} />
      <motion.div
        className="auth-box"
        initial={{ opacity: 0, rotateY: 30, scale: 0.9 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 15,
          duration: 0.8,
        }}
        whileHover={{ translateZ: 40 }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Sign In
        </motion.h2>
        <motion.form
          onSubmit={handleSubmit}
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="form-group" variants={inputVariants}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loginMutation.isPending}
              className="auth-input"
            />
          </motion.div>
          <motion.div className="form-group" variants={inputVariants}>
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loginMutation.isPending}
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
            <motion.button
              type="button"
              className="forgot-password-btn"
              onClick={() => setShowForgotPassword(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Forgot Password?
            </motion.button>
          </motion.div>
          <motion.button
            type="submit"
            className="submit-btn"
            disabled={loginMutation.isPending}
            variants={inputVariants}
            whileHover={{
              scale: 1.05,
              y: -5,
              boxShadow: "0 10px 25px rgba(106, 38, 205, 0.4)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            {loginMutation.isPending ? "Signing In..." : "Sign In"}
          </motion.button>

          <div className="divider">
            <span>Or</span>
          </div>

          <div className="google-login-container">
            <GoogleOAuthLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                toast.error("Google login failed");
              }}
            />
          </div>
        </motion.form>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Don't have an account?{" "}
          <motion.button
            className="switch-btn"
            onClick={switchToSignup}
            disabled={loginMutation.isPending}
            whileHover={{
              scale: 1.1,
              color: "#ffffff",
              textShadow: "0 0 8px rgba(255, 215, 0, 0.8)",
            }}
          >
            Sign Up
          </motion.button>
        </motion.p>
      </motion.div>
      {showForgotPassword && (
        <ForgotPassword onClose={() => setShowForgotPassword(false)} />
      )}
      {showOTPModal && (
        <OTPModal
          isOpen={showOTPModal}
          onClose={() => setShowOTPModal(false)}
          onVerify={async (otp: string) => {
            try {
              await verifyOTPMutation.mutateAsync(otp);
            } catch (error) {
              console.error('OTP verification failed:', error);
            }
          }}
          onResend={async () => {
            try {
              await resendOTPMutation.mutateAsync();
            } catch (error) {
              console.error('Failed to resend OTP:', error);
            }
          }}
          email={pendingEmail}
          isResendDisabled={resendOTPMutation.isPending}
          mode="signup"
        />
      )}
    </>
  );
};

export default Login;
