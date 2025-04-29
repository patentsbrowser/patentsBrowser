import './Settings.scss';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faUndo, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

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
    localStorage.getItem('preferredPatentAuthority') || 'US WO EP GB FR DE CH JP RU SU'
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
  const [isResultsEditMode, setIsResultsEditMode] = useState(false);
  const [isRecordEditMode, setIsRecordEditMode] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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


  const handleSetToDefault = (setting: string) => {
    switch (setting) {
      case 'patentAuthority':
        setPreferredPatentAuthority('US WO EP GB FR DE CH JP RU SU');
        break;
      case 'language':
        setPreferredLanguage('EN EM');
        break;
      default:
        break;
    }
  };

  const handleResultsConfirm = () => {
    localStorage.setItem('resultsPerPage', resultsPerPage);
    localStorage.setItem('fieldFormatDoc', fieldFormatDoc);
    localStorage.setItem('fieldFormatHitlist', fieldFormatHitlist);
    
    setShowSuccessMessage(true);
    setIsResultsEditMode(false);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 1500);
  };

  const handleResultsCancel = () => {
    setResultsPerPage(localStorage.getItem('resultsPerPage') || '50');
    setFieldFormatDoc(localStorage.getItem('fieldFormatDoc') || 'Detailed (spelled out)');
    setFieldFormatHitlist(localStorage.getItem('fieldFormatHitlist') || 'Detailed (spelled out)');
    setIsResultsEditMode(false);
  };

  const handleResultsEditClick = () => {
    setIsResultsEditMode(true);
  };

  const handleRestoreResultsDefaults = () => {
    setResultsPerPage('50');
    setFieldFormatDoc('Detailed (spelled out)');
    setFieldFormatHitlist('Detailed (spelled out)');
  };

  const handleRecordConfirm = () => {
    localStorage.setItem('preferredPatentAuthority', preferredPatentAuthority);
    localStorage.setItem('preferredPublicationStage', preferredPublicationStage);
    localStorage.setItem('publicationListOrder', publicationListOrder);
    localStorage.setItem('preferredLanguage', preferredLanguage);
    
    setShowSuccessMessage(true);
    setIsRecordEditMode(false);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 1500);
  };

  const handleRecordCancel = () => {
    setPreferredPatentAuthority(localStorage.getItem('preferredPatentAuthority') || 'US WO EP GB FR DE CH JP RU SU');
    setPreferredPublicationStage(localStorage.getItem('preferredPublicationStage') || 'grant');
    setPublicationListOrder(localStorage.getItem('publicationListOrder') || 'ascending');
    setPreferredLanguage(localStorage.getItem('preferredLanguage') || 'EN EM');
    setIsRecordEditMode(false);
  };

  const handleRecordEditClick = () => {
    setIsRecordEditMode(true);
  };

  const handleRestoreRecordDefaults = () => {
    setPreferredPatentAuthority('US WO EP GB FR DE CH JP RU SU');
    setPreferredPublicationStage('grant');
    setPublicationListOrder('ascending');
    setPreferredLanguage('EN EM');
  };

  return (
    <div className="settings-page-wrapper">
      <div className="settings-container">
        {showSuccessMessage && (
          <div className="success-message">
            <FontAwesomeIcon icon={faCheck} />
            Settings saved successfully!
          </div>
        )}

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
          <div className="section-header">
            <h3>Results</h3>
            {!isResultsEditMode && (
              <button className="edit-button" onClick={handleResultsEditClick}>
                <FontAwesomeIcon icon={faEdit} style={{ marginRight: '6px' }} />
                Edit
              </button>
            )}
          </div>
          <div className="setting-option">
            <div className="setting-label">Results per page:</div>
            <div className="setting-input-control">
              <select 
                value={resultsPerPage}
                onChange={(e) => isResultsEditMode && setResultsPerPage(e.target.value)}
                className="settings-dropdown"
                disabled={!isResultsEditMode}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          {isResultsEditMode && (
            <div className="settings-action-buttons">
              <button className="restore-button" onClick={handleRestoreResultsDefaults}>
                <FontAwesomeIcon icon={faUndo} style={{ marginRight: '6px' }} />
                Restore defaults
              </button>
              <div className="action-right-buttons">
                <button className="confirm-button" onClick={handleResultsConfirm}>
                  <FontAwesomeIcon icon={faCheck} style={{ marginRight: '6px' }} />
                  Confirm
                </button>
                <button className="cancel-button" onClick={handleResultsCancel}>
                  <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: '6px' }} />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-section">
          <div className="section-header">
            <h3>Record display settings</h3>
            {!isRecordEditMode && (
              <button className="edit-button" onClick={handleRecordEditClick}>
                <FontAwesomeIcon icon={faEdit} style={{ marginRight: '6px' }} />
                Edit
              </button>
            )}
          </div>
          <div className="setting-option">
            <div className="setting-label">Preferred patent authority:</div>
            <div className="setting-input-with-action">
              <input 
                type="text" 
                value={preferredPatentAuthority}
                onChange={(e) => setPreferredPatentAuthority(e.target.value)}
                className="settings-text-input"
                disabled={!isRecordEditMode}
              />
              {isRecordEditMode && (
                <button 
                  className="default-button" 
                  onClick={() => handleSetToDefault('patentAuthority')}
                >
                  Set to default
                </button>
              )}
            </div>
          </div>
          <div className="setting-option">
            <div className="setting-label">Preferred language:</div>
            <div className="setting-input-with-action">
              <input 
                type="text" 
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="settings-text-input"
                disabled={!isRecordEditMode}
              />
              {isRecordEditMode && (
                <button 
                  className="default-button" 
                  onClick={() => handleSetToDefault('language')}
                >
                  Set to default
                </button>
              )}
            </div>
          </div>
          {isRecordEditMode && (
            <div className="settings-action-buttons">
              <button className="restore-button" onClick={handleRestoreRecordDefaults}>
                <FontAwesomeIcon icon={faUndo} style={{ marginRight: '6px' }} />
                Restore defaults
              </button>
              <div className="action-right-buttons">
                <button className="confirm-button" onClick={handleRecordConfirm}>
                  <FontAwesomeIcon icon={faCheck} style={{ marginRight: '6px' }} />
                  Confirm
                </button>
                <button className="cancel-button" onClick={handleRecordCancel}>
                  <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: '6px' }} />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
  