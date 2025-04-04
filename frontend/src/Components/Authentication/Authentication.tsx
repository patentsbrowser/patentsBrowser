import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import './Authentication.scss';

const Authentication = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  
  useEffect(() => {
    // Set initial mode based on the current path
    if (location.pathname === '/auth/signup') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [location.pathname]);

  return (
    <div className="auth-container">
      {isLogin ? (
        <Login switchToSignup={() => setIsLogin(false)} />
      ) : (
        <Signup switchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  );
};

export default Authentication; 