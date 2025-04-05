import { NavLink } from 'react-router-dom';
import './Sidebar.scss';

const Sidebar = () => {
  const menuItems = [
    { path: '/auth/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/auth/patentSaver', label: 'Saved Patents', icon: '📑' },
    { path: '/auth/subscription', label: 'Subscription', icon: '💎' },
    { path: '/auth/settings', label: 'Settings', icon: '📝' },
    // { path: '/auth/charts', label: 'Charts', icon: '📈' },
    // { path: '/auth/trade', label: 'Trading Terminal', icon: '💹' },
    // { path: '/auth/strategies', label: 'Strategies', icon: '📚' },
    // { path: '/auth/signals', label: 'Trading Signals', icon: '🎯' },
    // { path: '/auth/backtest', label: 'Strategy Backtest', icon: '🔬' },
    { path: '/auth/update-profile', label: 'Update Profile', icon: '👤' },
  ];

  return (
    <div className="sidebar">
      <nav>
        {menuItems?.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 