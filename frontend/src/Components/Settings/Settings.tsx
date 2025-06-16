import './Settings.scss';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faUndo, faTimesCircle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useAutoScroll, getScrollStyles, getScrollClassName } from '../../hooks/useAutoScroll';

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
  const [isApiKeysEditMode, setIsApiKeysEditMode] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Enhanced API Keys state
  const [apiKeys, setApiKeys] = useState({
    googleAI: localStorage.getItem('patent_analyzer_google_ai_key') || '',
    openAI: localStorage.getItem('patent_analyzer_openai_key') || '',
    deepSeek: localStorage.getItem('patent_analyzer_deepseek_key') || '',
    anthropic: localStorage.getItem('patent_analyzer_anthropic_key') || '',
    cohere: localStorage.getItem('patent_analyzer_cohere_key') || '',
    huggingface: localStorage.getItem('patent_analyzer_huggingface_key') || '',
    custom: localStorage.getItem('patent_analyzer_custom_key') || ''
  });
  const [showApiKeys, setShowApiKeys] = useState({
    googleAI: false,
    openAI: false,
    deepSeek: false,
    anthropic: false,
    cohere: false,
    huggingface: false,
    custom: false
  });
  const [customApiName, setCustomApiName] = useState(localStorage.getItem('patent_analyzer_custom_name') || '');
  const [customApiUrl, setCustomApiUrl] = useState(localStorage.getItem('patent_analyzer_custom_url') || '');

  // Auto-scroll for API providers grid
  const apiProviders = Object.keys(apiKeys);
  const [apiGridRef, apiGridScrollState] = useAutoScroll({
    threshold: 400,
    maxHeight: '75vh',
    dependencies: [apiProviders.length, isApiKeysEditMode]
  });

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

  // API Keys handlers
  const handleApiKeysEditClick = () => {
    setIsApiKeysEditMode(true);
  };

  const handleApiKeysConfirm = () => {
    // Save all API keys
    localStorage.setItem('patent_analyzer_google_ai_key', apiKeys.googleAI);
    localStorage.setItem('patent_analyzer_openai_key', apiKeys.openAI);
    localStorage.setItem('patent_analyzer_deepseek_key', apiKeys.deepSeek);
    localStorage.setItem('patent_analyzer_anthropic_key', apiKeys.anthropic);
    localStorage.setItem('patent_analyzer_cohere_key', apiKeys.cohere);
    localStorage.setItem('patent_analyzer_huggingface_key', apiKeys.huggingface);
    localStorage.setItem('patent_analyzer_custom_key', apiKeys.custom);
    localStorage.setItem('patent_analyzer_custom_name', customApiName);
    localStorage.setItem('patent_analyzer_custom_url', customApiUrl);

    setShowSuccessMessage(true);
    setIsApiKeysEditMode(false);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 1500);
  };

  const handleApiKeysCancel = () => {
    setApiKeys({
      googleAI: localStorage.getItem('patent_analyzer_google_ai_key') || '',
      openAI: localStorage.getItem('patent_analyzer_openai_key') || '',
      deepSeek: localStorage.getItem('patent_analyzer_deepseek_key') || '',
      anthropic: localStorage.getItem('patent_analyzer_anthropic_key') || '',
      cohere: localStorage.getItem('patent_analyzer_cohere_key') || '',
      huggingface: localStorage.getItem('patent_analyzer_huggingface_key') || '',
      custom: localStorage.getItem('patent_analyzer_custom_key') || ''
    });
    setCustomApiName(localStorage.getItem('patent_analyzer_custom_name') || '');
    setCustomApiUrl(localStorage.getItem('patent_analyzer_custom_url') || '');
    setIsApiKeysEditMode(false);
  };

  const handleClearApiKeys = () => {
    setApiKeys({
      googleAI: '',
      openAI: '',
      deepSeek: '',
      anthropic: '',
      cohere: '',
      huggingface: '',
      custom: ''
    });
    setCustomApiName('');
    setCustomApiUrl('');
  };

  const toggleApiKeyVisibility = (provider: keyof typeof showApiKeys) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
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

        {/* Enhanced API Keys Section */}
        <div className="settings-section api-keys-section">
          <div className="section-header">
            <h3>🔑 AI Provider API Keys</h3>
            {!isApiKeysEditMode && (
              <button className="edit-button" onClick={handleApiKeysEditClick}>
                <FontAwesomeIcon icon={faEdit} style={{ marginRight: '6px' }} />
                Edit API Keys
              </button>
            )}
          </div>
          <div className="api-keys-description">
            <p>Configure your AI provider API keys for advanced patent analysis. All keys are stored securely in your browser and never transmitted to our servers.</p>
            <div className="security-badge">
              🔒 <strong>100% Secure:</strong> Keys stored locally only
            </div>
          </div>

          <div
            ref={apiGridRef}
            className={getScrollClassName(apiGridScrollState, "api-providers-grid")}
            style={getScrollStyles(apiGridScrollState)}
          >
            {/* Google AI */}
            <div className="api-provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <span className="provider-icon">🤖</span>
                  <div className="provider-details">
                    <h4>Google AI (Gemini)</h4>
                    <span className="api-badge free">FREE TIER</span>
                  </div>
                </div>
                <div className="provider-status">
                  {apiKeys.googleAI ? '✅' : '❌'}
                </div>
              </div>
              <div className="provider-description">
                <p>Free tier with generous limits. Perfect for beginners and small-scale analysis.</p>
                <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Get API Key →</a>
              </div>
              <div className="api-key-input-group">
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKeys.googleAI ? "text" : "password"}
                    value={apiKeys.googleAI}
                    onChange={(e) => isApiKeysEditMode && setApiKeys({...apiKeys, googleAI: e.target.value})}
                    className="settings-text-input api-key-input"
                    placeholder="AIza..."
                    disabled={!isApiKeysEditMode}
                  />
                  <button
                    className="visibility-toggle"
                    onClick={() => toggleApiKeyVisibility('googleAI')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={showApiKeys.googleAI ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
            </div>

            {/* OpenAI */}
            <div className="api-provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <span className="provider-icon">🧠</span>
                  <div className="provider-details">
                    <h4>OpenAI (GPT-4)</h4>
                    <span className="api-badge paid">PREMIUM</span>
                  </div>
                </div>
                <div className="provider-status">
                  {apiKeys.openAI ? '✅' : '❌'}
                </div>
              </div>
              <div className="provider-description">
                <p>Premium quality analysis with advanced reasoning capabilities. Pay-per-use pricing.</p>
                <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">Get API Key →</a>
              </div>
              <div className="api-key-input-group">
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKeys.openAI ? "text" : "password"}
                    value={apiKeys.openAI}
                    onChange={(e) => isApiKeysEditMode && setApiKeys({...apiKeys, openAI: e.target.value})}
                    className="settings-text-input api-key-input"
                    placeholder="sk-..."
                    disabled={!isApiKeysEditMode}
                  />
                  <button
                    className="visibility-toggle"
                    onClick={() => toggleApiKeyVisibility('openAI')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={showApiKeys.openAI ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
            </div>

            {/* DeepSeek */}
            <div className="api-provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <span className="provider-icon">🔍</span>
                  <div className="provider-details">
                    <h4>DeepSeek AI</h4>
                    <span className="api-badge paid">COST-EFFECTIVE</span>
                  </div>
                </div>
                <div className="provider-status">
                  {apiKeys.deepSeek ? '✅' : '❌'}
                </div>
              </div>
              <div className="provider-description">
                <p>Cost-effective option with competitive rates and strong technical comprehension.</p>
                <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer">Get API Key →</a>
              </div>
              <div className="api-key-input-group">
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKeys.deepSeek ? "text" : "password"}
                    value={apiKeys.deepSeek}
                    onChange={(e) => isApiKeysEditMode && setApiKeys({...apiKeys, deepSeek: e.target.value})}
                    className="settings-text-input api-key-input"
                    placeholder="sk-..."
                    disabled={!isApiKeysEditMode}
                  />
                  <button
                    className="visibility-toggle"
                    onClick={() => toggleApiKeyVisibility('deepSeek')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={showApiKeys.deepSeek ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
            </div>

            {/* Anthropic */}
            <div className="api-provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <span className="provider-icon">🎭</span>
                  <div className="provider-details">
                    <h4>Anthropic (Claude)</h4>
                    <span className="api-badge paid">PREMIUM</span>
                  </div>
                </div>
                <div className="provider-status">
                  {apiKeys.anthropic ? '✅' : '❌'}
                </div>
              </div>
              <div className="provider-description">
                <p>Advanced AI with strong reasoning and safety features. Excellent for complex analysis.</p>
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Get API Key →</a>
              </div>
              <div className="api-key-input-group">
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKeys.anthropic ? "text" : "password"}
                    value={apiKeys.anthropic}
                    onChange={(e) => isApiKeysEditMode && setApiKeys({...apiKeys, anthropic: e.target.value})}
                    className="settings-text-input api-key-input"
                    placeholder="sk-ant-..."
                    disabled={!isApiKeysEditMode}
                  />
                  <button
                    className="visibility-toggle"
                    onClick={() => toggleApiKeyVisibility('anthropic')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={showApiKeys.anthropic ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
            </div>

            {/* Cohere */}
            <div className="api-provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <span className="provider-icon">🌐</span>
                  <div className="provider-details">
                    <h4>Cohere AI</h4>
                    <span className="api-badge paid">ENTERPRISE</span>
                  </div>
                </div>
                <div className="provider-status">
                  {apiKeys.cohere ? '✅' : '❌'}
                </div>
              </div>
              <div className="provider-description">
                <p>Enterprise-grade AI with strong multilingual capabilities and semantic understanding.</p>
                <a href="https://dashboard.cohere.ai/" target="_blank" rel="noopener noreferrer">Get API Key →</a>
              </div>
              <div className="api-key-input-group">
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKeys.cohere ? "text" : "password"}
                    value={apiKeys.cohere}
                    onChange={(e) => isApiKeysEditMode && setApiKeys({...apiKeys, cohere: e.target.value})}
                    className="settings-text-input api-key-input"
                    placeholder="co-..."
                    disabled={!isApiKeysEditMode}
                  />
                  <button
                    className="visibility-toggle"
                    onClick={() => toggleApiKeyVisibility('cohere')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={showApiKeys.cohere ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
            </div>

            {/* Hugging Face */}
            <div className="api-provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <span className="provider-icon">🤗</span>
                  <div className="provider-details">
                    <h4>Hugging Face</h4>
                    <span className="api-badge free">OPEN SOURCE</span>
                  </div>
                </div>
                <div className="provider-status">
                  {apiKeys.huggingface ? '✅' : '❌'}
                </div>
              </div>
              <div className="provider-description">
                <p>Access to thousands of open-source models. Great for specialized and custom models.</p>
                <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">Get API Key →</a>
              </div>
              <div className="api-key-input-group">
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKeys.huggingface ? "text" : "password"}
                    value={apiKeys.huggingface}
                    onChange={(e) => isApiKeysEditMode && setApiKeys({...apiKeys, huggingface: e.target.value})}
                    className="settings-text-input api-key-input"
                    placeholder="hf_..."
                    disabled={!isApiKeysEditMode}
                  />
                  <button
                    className="visibility-toggle"
                    onClick={() => toggleApiKeyVisibility('huggingface')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={showApiKeys.huggingface ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
            </div>

            {/* Custom API */}
            <div className="api-provider-card custom-api">
              <div className="provider-header">
                <div className="provider-info">
                  <span className="provider-icon">⚙️</span>
                  <div className="provider-details">
                    <h4>Custom API</h4>
                    <span className="api-badge custom">CUSTOM</span>
                  </div>
                </div>
                <div className="provider-status">
                  {apiKeys.custom ? '✅' : '❌'}
                </div>
              </div>
              <div className="provider-description">
                <p>Connect your own AI API endpoint. Perfect for private models or custom implementations.</p>
              </div>
              {isApiKeysEditMode && (
                <div className="custom-api-config">
                  <div className="api-key-input-group">
                    <label>API Name</label>
                    <input
                      type="text"
                      value={customApiName}
                      onChange={(e) => setCustomApiName(e.target.value)}
                      className="settings-text-input"
                      placeholder="My Custom AI"
                    />
                  </div>
                  <div className="api-key-input-group">
                    <label>API Endpoint URL</label>
                    <input
                      type="text"
                      value={customApiUrl}
                      onChange={(e) => setCustomApiUrl(e.target.value)}
                      className="settings-text-input"
                      placeholder="https://api.example.com/v1/chat/completions"
                    />
                  </div>
                </div>
              )}
              <div className="api-key-input-group">
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKeys.custom ? "text" : "password"}
                    value={apiKeys.custom}
                    onChange={(e) => isApiKeysEditMode && setApiKeys({...apiKeys, custom: e.target.value})}
                    className="settings-text-input api-key-input"
                    placeholder="your-custom-api-key"
                    disabled={!isApiKeysEditMode}
                  />
                  <button
                    className="visibility-toggle"
                    onClick={() => toggleApiKeyVisibility('custom')}
                    type="button"
                  >
                    <FontAwesomeIcon icon={showApiKeys.custom ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isApiKeysEditMode && (
            <div className="settings-action-buttons">
              <button className="restore-button" onClick={handleClearApiKeys}>
                <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: '6px' }} />
                Clear all keys
              </button>
              <div className="action-right-buttons">
                <button className="confirm-button" onClick={handleApiKeysConfirm}>
                  <FontAwesomeIcon icon={faCheck} style={{ marginRight: '6px' }} />
                  Confirm
                </button>
                <button className="cancel-button" onClick={handleApiKeysCancel}>
                  <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: '6px' }} />
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="api-keys-help">
            <h4>🔗 Quick Setup Links:</h4>
            <ul>
              <li><a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Google AI Studio</a> - Get free API key</li>
              <li><a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">OpenAI Platform</a> - Premium analysis</li>
              <li><a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek Platform</a> - Cost-effective option</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
  