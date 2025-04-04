import './Settings.scss';
import { useState, useEffect } from 'react';

interface SettingsProps {
  onSidebarBehaviorChange?: (behavior: 'auto' | 'manual') => void;
  initialSidebarBehavior?: 'auto' | 'manual';
}

const Settings: React.FC<SettingsProps> = ({ 
  onSidebarBehaviorChange,
  initialSidebarBehavior = 'auto'
}) => {
  const [sidebarBehavior, setSidebarBehavior] = useState<'auto' | 'manual'>(initialSidebarBehavior);

  console.log('sidebarBehavior', sidebarBehavior)
  // Save setting to localStorage when changed
  useEffect(() => {
    localStorage.setItem('sidebarBehavior', sidebarBehavior);
    if (onSidebarBehaviorChange) {
      onSidebarBehaviorChange(sidebarBehavior);
    }
  }, [sidebarBehavior, onSidebarBehaviorChange]);

  const handleBehaviorChange = (newBehavior: 'auto' | 'manual') => {
    setSidebarBehavior(newBehavior);
  };

  return (
    <div className="settings-container">
      <h2>Settings</h2>
      
      <div className="settings-section">
        <h3>Sidebar Behavior</h3>
        <div className="setting-option">
          <div className="setting-label">Dashboard Sidebar Expansion:</div>
          <div className="toggle-control">
            <div 
              className={`toggle-option ${sidebarBehavior === 'auto' ? 'active' : ''}`}
              onClick={() => handleBehaviorChange('auto')}
            >
              Auto (Hover)
            </div>
            <div 
              className={`toggle-option ${sidebarBehavior === 'manual' ? 'active' : ''}`}
              onClick={() => handleBehaviorChange('manual')}
            >
              Manual (Pin)
            </div>
          </div>
          <div className="setting-description">
            {sidebarBehavior === 'auto' ? 
              'Sidebar will automatically expand on mouse hover' : 
              'Sidebar will only expand when the pin button is clicked'}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Settings;
  