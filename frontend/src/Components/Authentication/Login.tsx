import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../AuthContext";
import { useNavigate } from "react-router-dom";
import "./Authentication.scss";
import toast from "react-hot-toast";
import Loader from "../Loader/Loader";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { authApi } from "../../api/auth";

const Login = ({ switchToSignup }: { switchToSignup: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();
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

  return (
    <>
      <Loader isLoading={loginMutation.isPending} />
      <div className="auth-box">
        <h2>Sign In</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
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
          </div>
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
                disabled={loginMutation.isPending}
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
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <p>
          Don't have an account?{' '}
          <button
            className="switch-btn"
            onClick={switchToSignup}
            disabled={loginMutation.isPending}
          >
            Sign Up
          </button>
        </p>
      </div>
    </>
  );
};

export default Login;
