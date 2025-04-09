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
  const [preferredPatentAuthority, setPreferredPatentAuthority] = useState<string>(
    localStorage.getItem('preferredPatentAuthority') || 'US EP WO GB FR DE CH JP RU SU'
  );
  const [preferredPublicationStage, setPreferredPublicationStage] = useState<string>(
    localStorage.getItem('preferredPublicationStage') || 'grant'
  );
  const [publicationListOrder, setPublicationListOrder] = useState<string>(
    localStorage.getItem('publicationListOrder') || 'ascending'
  );
  const [preferredLanguage, setPreferredLanguage] = useState<string>(
    localStorage.getItem('preferredLanguage') || 'EN EM'
  );
  const [resultsPerPage, setResultsPerPage] = useState<string>(
    localStorage.getItem('resultsPerPage') || '50'
  );
  const [fieldFormatDoc, setFieldFormatDoc] = useState<string>(
    localStorage.getItem('fieldFormatDoc') || 'Detailed (spelled out)'
  );
  const [fieldFormatHitlist, setFieldFormatHitlist] = useState<string>(
    localStorage.getItem('fieldFormatHitlist') || 'Detailed (spelled out)'
  );

  // Save settings to localStorage when changed
  useEffect(() => {
    localStorage.setItem('sidebarBehavior', sidebarBehavior);
    if (onSidebarBehaviorChange) {
      onSidebarBehaviorChange(sidebarBehavior);
    }
  }, [sidebarBehavior, onSidebarBehaviorChange]);

  useEffect(() => {
    localStorage.setItem('preferredPatentAuthority', preferredPatentAuthority);
  }, [preferredPatentAuthority]);

  useEffect(() => {
    localStorage.setItem('preferredPublicationStage', preferredPublicationStage);
  }, [preferredPublicationStage]);

  useEffect(() => {
    localStorage.setItem('publicationListOrder', publicationListOrder);
  }, [publicationListOrder]);

  useEffect(() => {
    localStorage.setItem('preferredLanguage', preferredLanguage);
  }, [preferredLanguage]);

  useEffect(() => {
    localStorage.setItem('resultsPerPage', resultsPerPage);
  }, [resultsPerPage]);

  useEffect(() => {
    localStorage.setItem('fieldFormatDoc', fieldFormatDoc);
  }, [fieldFormatDoc]);

  useEffect(() => {
    localStorage.setItem('fieldFormatHitlist', fieldFormatHitlist);
  }, [fieldFormatHitlist]);

  const handleBehaviorChange = (newBehavior: 'auto' | 'manual') => {
    setSidebarBehavior(newBehavior);
  };

  const handlePatentAuthorityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreferredPatentAuthority(e.target.value);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreferredLanguage(e.target.value);
  };

  const handleSetToDefault = (setting: string) => {
    switch (setting) {
      case 'patentAuthority':
        setPreferredPatentAuthority('US EP WO GB FR DE CH JP RU SU');
        break;
      case 'language':
        setPreferredLanguage('EN EM');
        break;
      default:
        break;
    }
  };

  const handleRestoreDefaults = () => {
    setPreferredPatentAuthority('US EP WO GB FR DE CH JP RU SU');
    setPreferredPublicationStage('grant');
    setPublicationListOrder('ascending');
    setPreferredLanguage('EN EM');
    setResultsPerPage('50');
    setFieldFormatDoc('Detailed (spelled out)');
    setFieldFormatHitlist('Detailed (spelled out)');
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

      <div className="settings-section">
        <h3 className="section-header">Results</h3>
        <div className="setting-option">
          <div className="setting-label">Results per page:</div>
          <div className="setting-input-control">
            <select 
              value={resultsPerPage}
              onChange={(e) => setResultsPerPage(e.target.value)}
              className="settings-dropdown"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
        <div className="setting-option">
          <div className="setting-label">Field format for document:</div>
          <div className="setting-input-control">
            <select 
              value={fieldFormatDoc}
              onChange={(e) => setFieldFormatDoc(e.target.value)}
              className="settings-dropdown"
            >
              <option value="Detailed (spelled out)">Detailed (spelled out)</option>
              <option value="Abbreviated">Abbreviated</option>
            </select>
          </div>
        </div>
        <div className="setting-option">
          <div className="setting-label">Field format for hitlist:</div>
          <div className="setting-input-control">
            <select 
              value={fieldFormatHitlist}
              onChange={(e) => setFieldFormatHitlist(e.target.value)}
              className="settings-dropdown"
            >
              <option value="Detailed (spelled out)">Detailed (spelled out)</option>
              <option value="Abbreviated">Abbreviated</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="settings-section">
        <h3 className="section-header">Record display settings</h3>
        <div className="setting-option">
          <div className="setting-label">Preferred patent authority:</div>
          <div className="setting-input-with-action">
            <input 
              type="text" 
              value={preferredPatentAuthority}
              onChange={handlePatentAuthorityChange}
              className="settings-text-input"
            />
            <button 
              className="default-button" 
              onClick={() => handleSetToDefault('patentAuthority')}
            >
              Set to default
            </button>
          </div>
        </div>
        <div className="setting-option">
          <div className="setting-label">Preferred publication stage:</div>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="publicationStage"
                value="application"
                checked={preferredPublicationStage === 'application'}
                onChange={() => setPreferredPublicationStage('application')}
              />
              application
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="publicationStage"
                value="grant"
                checked={preferredPublicationStage === 'grant'}
                onChange={() => setPreferredPublicationStage('grant')}
              />
              grant
            </label>
          </div>
        </div>
        <div className="setting-option">
          <div className="setting-label">Publication list display order:</div>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="listOrder"
                value="ascending"
                checked={publicationListOrder === 'ascending'}
                onChange={() => setPublicationListOrder('ascending')}
              />
              ascending
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="listOrder"
                value="descending"
                checked={publicationListOrder === 'descending'}
                onChange={() => setPublicationListOrder('descending')}
              />
              descending
            </label>
          </div>
        </div>
        <div className="setting-option">
          <div className="setting-label">Preferred language:</div>
          <div className="setting-input-with-action">
            <input 
              type="text" 
              value={preferredLanguage}
              onChange={handleLanguageChange}
              className="settings-text-input"
            />
            <button 
              className="default-button" 
              onClick={() => handleSetToDefault('language')}
            >
              Set to default
            </button>
          </div>
        </div>
      </div>

      <div className="settings-action-buttons">
        <button className="restore-button" onClick={handleRestoreDefaults}>
          Restore defaults
        </button>
        <div className="action-right-buttons">
          <button className="confirm-button">
            Confirm
          </button>
          <button className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
  