import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import './Authentication.scss';
import { FaComments, FaHome } from 'react-icons/fa';
// import { FaHome, FaComments } from 'react-icons/fa';

const Authentication = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  useEffect(() => {
    // Set initial mode based on the current path
    if (location.pathname === '/auth/signup') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [location.pathname]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const switchToSignup = () => {
    setIsLogin(false);
    navigate('/auth/signup', { replace: true });
  };

  const switchToLogin = () => {
    setIsLogin(true);
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="auth-container">
      <div className="auth-nav">
        <div className="logo" onClick={() => handleNavigation('/')}>AllinoneSearch</div>
        <div className="nav-buttons">
          <button 
            className="btn btn-home"
            onClick={() => handleNavigation('/')}
          >
            <FaHome style={{ marginRight: '6px' }} /> Home
          </button>
          <button 
            className="btn btn-forum"
            onClick={() => handleNavigation('/forum')}
          >
            <FaComments style={{ marginRight: '6px' }} /> Forum
          </button>
        </div>
      </div>
      
      {isLogin ? (
        <Login switchToSignup={switchToSignup} />
      ) : (
        <Signup switchToLogin={switchToLogin} />
      )}
    </div>
  );
};

export default Authentication; 