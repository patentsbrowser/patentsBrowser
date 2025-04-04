import  { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import './Authentication.scss';

const Authentication = () => {
  const [isLogin, setIsLogin] = useState(true);

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