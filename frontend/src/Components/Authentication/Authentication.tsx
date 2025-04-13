import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import './Authentication.scss';
import { FaComments, FaHome } from 'react-icons/fa';
import { motion } from 'framer-motion';
// import { FaHome, FaComments } from 'react-icons/fa';

// Animated background component with floating patent IDs
const FloatingPatents = () => {
  const patentItems = Array.from({ length: 15 }, (_, i) => ({
    id: `US${Math.floor(10000000 + Math.random() * 90000000)}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 0.5 + 0.7,
    speed: Math.random() * 15 + 20,
    delay: Math.random() * 2,
  }));

  return (
    <div className="floating-patents-container">
      {patentItems.map((patent, index) => (
        <motion.div
          key={index}
          className="floating-patent-id"
          initial={{
            x: `${patent.x}vw`,
            y: `${patent.y}vh`,
            opacity: 0,
          }}
          animate={{
            x: [
              `${patent.x}vw`,
              `${(patent.x + 30) % 100}vw`,
              `${(patent.x + 60) % 100}vw`,
              `${patent.x}vw`,
            ],
            y: [
              `${patent.y}vh`,
              `${(patent.y + 15) % 100}vh`,
              `${(patent.y - 15 + 100) % 100}vh`,
              `${patent.y}vh`,
            ],
            opacity: [0, 0.7, 0.7, 0],
            scale: [patent.size, patent.size * 1.2, patent.size],
          }}
          transition={{
            duration: patent.speed,
            ease: "easeInOut",
            times: [0, 0.3, 0.7, 1],
            repeat: Infinity,
            delay: patent.delay,
          }}
          style={{
            fontSize: `${1 + patent.size}rem`,
          }}
        >
          {patent.id}
        </motion.div>
      ))}
    </div>
  );
};

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
    <motion.div 
      className="auth-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
    >
      <motion.div 
        className="auth-nav"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
      >
        <motion.div 
          className="logo" 
          onClick={() => handleNavigation('/')}
          whileHover={{ scale: 1.05, rotate: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          PatentsBrowser
        </motion.div>
        <div className="nav-buttons">
          <motion.button 
            className="btn btn-home"
            onClick={() => handleNavigation('/')}
            whileHover={{ scale: 1.05, y: -5, boxShadow: "0px 10px 25px rgba(106, 38, 205, 0.3)" }}
            whileTap={{ scale: 0.95 }}
          >
            <FaHome style={{ marginRight: '6px' }} /> Home
          </motion.button>
          <motion.button 
            className="btn btn-forum"
            onClick={() => handleNavigation('/forum')}
            whileHover={{ scale: 1.05, y: -5, boxShadow: "0px 10px 25px rgba(255, 215, 0, 0.3)" }}
            whileTap={{ scale: 0.95 }}
          >
            <FaComments style={{ marginRight: '6px' }} /> Forum
          </motion.button>
        </div>
      </motion.div>
      
      {/* Dynamic floating patents background */}
      <FloatingPatents />
      
      <motion.div 
        className="auth-content-wrapper"
        initial={{ opacity: 0, y: 20, rotateX: 15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ 
          delay: 0.4, 
          duration: 0.8, 
          type: "spring",
          damping: 20
        }}
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          flex: 1
        }}
      >
        {isLogin ? (
          <Login switchToSignup={switchToSignup} />
        ) : (
          <Signup switchToLogin={switchToLogin} />
        )}
      </motion.div>

      {/* Animated background elements */}
      <motion.div
        className="floating-patent"
        initial={{ opacity: 0, x: -100, rotate: -10 }}
        animate={{ opacity: 0.7, x: 0, rotate: 0 }}
        transition={{ delay: 0.8, duration: 1.2 }}
      />
      
      <motion.div
        className="floating-magnifier"
        initial={{ opacity: 0, x: 100, rotate: 10 }}
        animate={{ opacity: 0.7, x: 0, rotate: 0 }}
        transition={{ delay: 1, duration: 1.2 }}
      />

      <motion.div
        className="floating-grid"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ delay: 1.2, duration: 1.5 }}
      />
    </motion.div>
  );
};

export default Authentication; 