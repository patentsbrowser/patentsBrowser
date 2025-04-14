import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Admin.scss';

// Default pagination options
const DEFAULT_PAGINATION_OPTIONS = [10, 25, 50, 100];

const AdminSettings = () => {
  const [defaultPaginationLimit, setDefaultPaginationLimit] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  // In a real app, you'd load these settings from an API
  // For now, we'll use localStorage for demo purposes
  useEffect(() => {
    const savedLimit = localStorage.getItem('adminDefaultPaginationLimit');
    if (savedLimit) {
      setDefaultPaginationLimit(Number(savedLimit));
    }
  }, []);

  const handlePaginationLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDefaultPaginationLimit(Number(e.target.value));
  };

  const saveSettings = () => {
    setIsSaving(true);
    
    // In a real app, you'd save these settings to an API
    // For demo purposes, we'll use localStorage
    localStorage.setItem('adminDefaultPaginationLimit', defaultPaginationLimit.toString());
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Settings saved successfully');
      
      // Dispatch a custom event so other components can update
      window.dispatchEvent(new CustomEvent('adminSettingsUpdated', {
        detail: { defaultPaginationLimit }
      }));
    }, 500);
  };

  return (
    <div className="admin-settings-container">
      <h1>Admin Settings</h1>
      
      <div className="settings-section">
        <h2>Table Display Settings</h2>
        
        <div className="setting-group">
          <label htmlFor="defaultPaginationLimit">Default items per page:</label>
          <select 
            id="defaultPaginationLimit" 
            value={defaultPaginationLimit} 
            onChange={handlePaginationLimitChange}
            className="settings-select"
          >
            {DEFAULT_PAGINATION_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <p className="setting-description">
            This setting controls the default number of items displayed per page in tables across the admin dashboard.
          </p>
        </div>
      </div>
      
      <div className="settings-actions">
        <button 
          className="btn btn-primary" 
          onClick={saveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings; 