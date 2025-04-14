import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../AuthContext";
import { useNavigate } from "react-router-dom";
import "./Authentication.scss";
import toast from "react-hot-toast";
import Loader from "../Loader/Loader";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { authApi } from "../../api/auth";
import { motion } from "framer-motion";

const Login = ({ switchToSignup }: { switchToSignup: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setUser, forceAdminCheck } = useAuth();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: () => {
      console.log("Attempting login with:", { email, password });
      return authApi.login({ email, password });
    },
    onSuccess: (response) => {
      console.log("Login response:", response);
      if (response.statusCode === 200) {
        toast.success("Login successful!");
        // Store token and user data from the response
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        // Set user state from the response
        setUser(response.data.user);
        
        // Use the centralized admin check method instead of making a direct API call
        console.log("Triggering centralized admin check after login");
        setTimeout(() => {
          forceAdminCheck();
        }, 500);
        
        navigate("/auth/dashboard");
      } else {
        toast.error(response.message || "Login failed. Please check your credentials.");
      }
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    },
  });

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
      <Loader isLoading={loginMutation.isPending} />
      <motion.div 
        className="auth-box"
        initial={{ opacity: 0, rotateY: 30, scale: 0.9 }}
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
        >Sign In</motion.h2>
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
          </motion.div>
          <motion.button 
            type="submit" 
            className="submit-btn"
            disabled={loginMutation.isPending}
            variants={inputVariants}
            whileHover={{ 
              scale: 1.05, 
              y: -5,
              boxShadow: "0 10px 25px rgba(106, 38, 205, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
          </motion.button>
        </motion.form>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Don't have an account?{' '}
          <motion.button
            className="switch-btn"
            onClick={switchToSignup}
            disabled={loginMutation.isPending}
            whileHover={{ 
              scale: 1.1,
              color: "#ffffff",
              textShadow: "0 0 8px rgba(255, 215, 0, 0.8)" 
            }}
          >
            Sign Up
          </motion.button>
        </motion.p>
      </motion.div>
    </>
  );
};

export default Login;
