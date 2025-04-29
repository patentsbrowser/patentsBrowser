import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import './Header.scss';
import { useAuth } from "../../AuthContext";
import { useTheme } from '../../context/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import LogoutModal from '../Modal/LogoutModal';
import ChangePassword from '../ChangePassword/ChangePassword';
import ModeSwitcher from './ModeSwitcher';
import { useAdmin } from '../../context/AdminContext';

interface ProfileResponse {
  statusCode: number;
  data: any;
  message?: string;
}

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface HeaderProps {
  isVisible?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isVisible = true }) => {
  const { logout, user }:any = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { isAdminMode } = useAdmin();

  // Get profile from Redux store
  const reduxProfile = useSelector((state:any) => state.auth.profile);
  
  // Also fetch latest profile data from API - but only do this on mount and after navigation
  // from the profile update page, not when image is uploaded
  const { data: profileResponse } = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
    staleTime: 10000,
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true,
    enabled: true, // Always enabled, but we control refetching manually
  });
  // Update Redux when profile data changes from API
  useEffect(() => {
    if (profileResponse?.statusCode === 200 && profileResponse?.data) {
      dispatch({ 
        type: 'UPDATE_PROFILE', 
        payload: profileResponse.data 
      });
    }
  }, [profileResponse, dispatch]);
  
  // Use API data if available, otherwise fall back to Redux store
  const apiProfile = profileResponse?.statusCode === 200 ? profileResponse.data : null;
  const profile = apiProfile || reduxProfile;
  
  // Get profile image URL
  const profileImage = profile?.imageUrl;
  const profileName = profile?.name || '';
  
  // Check for admin status - direct access for debugging
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if the profile indicates admin status
    if (profile?.isAdmin) {
      setIsAdmin(true);
    } else {
      // Fallback to localStorage
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser?.isAdmin) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }
  }, [profile]);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      // Clear localStorage on successful logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setShowLogoutModal(false);
      setShowDropdown(false);
      navigate('/');
    } catch (error: any) {
      navigate('/');
      setShowLogoutModal(false);
      setShowDropdown(false);
    }
  };

  // Force a refetch only when the component mounts initially
  // or after navigating from the update-profile page
  useEffect(() => {
    // This effect runs on mount and when location changes
    const fromUpdateProfile = location.state?.fromUpdateProfile === true;
    
    if (fromUpdateProfile) {
      // If we just came from the update profile page, refetch
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  }, [location, queryClient]);

  const userMenuItems: MenuItem[] = [
    { path: '/auth/dashboard', label: 'Dashboard', icon: '📊', exact: false },
    { path: '/auth/patent-history', label: 'Patent History', icon: '🕒', exact: false },
    { path: '/auth/patentSaver', label: 'Upload Files', icon: '📑', exact: false },
    { path: '/auth/subscription', label: 'Subscription', icon: '💎', exact: false },
    { path: '/auth/payment-history', label: 'Payment History', icon: '💳', exact: false },
    { path: '/auth/update-profile', label: 'Update Profile', icon: '👤', exact: false },
    { path: '/auth/settings', label: 'Settings', icon: '📝', exact: false },
  ];

  const adminMenuItems: MenuItem[] = [
    { path: '/auth/dashboard', exact: true, label: 'Admin Dashboard', icon: '⚙️' },
    { path: '/auth/admin/users', label: 'Manage Users', icon: '👥' },
    { path: '/auth/admin/subscriptions', label: 'Subscriptions', icon: '💰' },
    { path: '/auth/admin/settings', label: 'Admin Settings', icon: '🔧' },
  ];

  const shouldShowAdminMenu = user?.isAdmin && isAdminMode;

  return (
    <header className={`header ${!isVisible ? 'header-hidden' : ''}`}>
      <div className="header-left">
        <h1>{isAdmin && isAdminMode ? 'Admin Dashboard' : 'User Dashboard'}</h1>
        <nav className="header-nav">
          {(shouldShowAdminMenu ? adminMenuItems : userMenuItems)?.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => {
                if (item.exact) {
                  return isActive && location.pathname === item.path ? 'active' : '';
                }
                return isActive ? 'active' : '';
              }}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="header-right">
        {isAdmin && <ModeSwitcher />}
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="user-profile" ref={dropdownRef}>
          <div className="profile-icon" onClick={toggleDropdown}>
            {profileImage ? (
              <img 
                src={`http://localhost:5000${profileImage}`} 
                alt="Profile" 
                className="profile-image" 
                key={profileImage}
              />
            ) : (
              <div className="profile-image-placeholder">
                <span>{profileName.charAt(0) || '👤'}</span>
              </div>
            )}
          </div>
          {showDropdown && (
            <div className="dropdown-menu">
              <Link to="/auth/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                Profile
              </Link>
              <button 
                className="dropdown-item" 
                onClick={() => {
                  setShowChangePassword(true);
                  setShowDropdown(false);
                }}
              >
                Change Password
              </button>
              <button className="dropdown-item logout" onClick={() => {
                setShowLogoutModal(true);
                setShowDropdown(false);
              }}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      <LogoutModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onLogout={handleLogout}
      />
      <ChangePassword
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </header>
  );
};

export default Header; 