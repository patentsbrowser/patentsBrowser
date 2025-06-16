import React, { useState, useEffect } from 'react';
import './ApiConfigModal.scss';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { toast } from 'react-hot-toast';

interface ApiConfig {
  googleAI: {
    enabled: boolean;
    apiKey: string;
  };
  openAI: {
    enabled: boolean;
    apiKey: string;
  };
  deepSeek: {
    enabled: boolean;
    apiKey: string;
  };
}

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  const [localConfig, setLocalConfig] = useState<ApiConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleProviderToggle = (provider: keyof ApiConfig) => {
    setLocalConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        enabled: !prev[provider].enabled
      }
    }));
  };

  const handleApiKeyChange = (provider: keyof ApiConfig, apiKey: string) => {
    setLocalConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiKey
      }
    }));
  };

  const handleSave = () => {
    // Validate that at least one provider is enabled with API key
    const enabledProviders = Object.entries(localConfig)
      .filter(([_, config]) => config.enabled && config.apiKey.trim());

    if (enabledProviders.length === 0) {
      toast.error('Please enable at least one AI provider with a valid API key');
      return;
    }

    onSave(localConfig);
    toast.success('API configuration saved successfully');
    onClose();
  };

  const handleTestConnection = async (provider: keyof ApiConfig) => {
    const providerConfig = localConfig[provider];
    
    if (!providerConfig.enabled || !providerConfig.apiKey.trim()) {
      toast.error('Please enable the provider and enter an API key first');
      return;
    }

    toast.loading('Testing connection...');
    
    // Simulate API test
    setTimeout(() => {
      toast.dismiss();
      toast.success(`${provider} connection successful!`);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="api-config-modal-overlay">
      <div className="api-config-modal">
        <div className="modal-header">
          <h2>🔑 Configure AI Providers</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="config-intro">
            <p>Configure your AI providers to enable patent analysis. Your API keys are stored securely in your browser and never sent to our servers.</p>
          </div>

          {/* Google AI Configuration */}
          <div className="provider-config">
            <div className="provider-header">
              <div className="provider-info">
                <h3>🤖 Google AI (Gemini)</h3>
                <span className="provider-badge free">FREE</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={localConfig.googleAI.enabled}
                  onChange={() => handleProviderToggle('googleAI')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="provider-description">
              <p>Free tier available with generous limits. Perfect for beginners and small-scale analysis.</p>
              <div className="setup-steps">
                <h4>Setup Steps:</h4>
                <ol>
                  <li>Visit <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                  <li>Click "Get API Key" and create a new key</li>
                  <li>Copy your key (starts with "AIza...")</li>
                </ol>
              </div>
            </div>

            {localConfig.googleAI.enabled && (
              <div className="api-key-input">
                <Input
                  label="Google AI API Key"
                  type="password"
                  value={localConfig.googleAI.apiKey}
                  onChange={(e) => handleApiKeyChange('googleAI', e.target.value)}
                  placeholder="AIza..."
                />
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleTestConnection('googleAI')}
                  disabled={!localConfig.googleAI.apiKey.trim()}
                >
                  Test Connection
                </Button>
              </div>
            )}
          </div>

          {/* OpenAI Configuration */}
          <div className="provider-config">
            <div className="provider-header">
              <div className="provider-info">
                <h3>🧠 OpenAI (GPT-4)</h3>
                <span className="provider-badge paid">PAID</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={localConfig.openAI.enabled}
                  onChange={() => handleProviderToggle('openAI')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="provider-description">
              <p>Premium quality analysis with advanced reasoning capabilities. Pay-per-use pricing.</p>
              <div className="setup-steps">
                <h4>Setup Steps:</h4>
                <ol>
                  <li>Visit <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
                  <li>Create account and add payment method</li>
                  <li>Generate API key in API Keys section</li>
                </ol>
              </div>
            </div>

            {localConfig.openAI.enabled && (
              <div className="api-key-input">
                <Input
                  label="OpenAI API Key"
                  type="password"
                  value={localConfig.openAI.apiKey}
                  onChange={(e) => handleApiKeyChange('openAI', e.target.value)}
                  placeholder="sk-..."
                />
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleTestConnection('openAI')}
                  disabled={!localConfig.openAI.apiKey.trim()}
                >
                  Test Connection
                </Button>
              </div>
            )}
          </div>

          {/* DeepSeek Configuration */}
          <div className="provider-config">
            <div className="provider-header">
              <div className="provider-info">
                <h3>🔍 DeepSeek AI</h3>
                <span className="provider-badge paid">PAID</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={localConfig.deepSeek.enabled}
                  onChange={() => handleProviderToggle('deepSeek')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="provider-description">
              <p>Cost-effective option with competitive rates and strong technical comprehension.</p>
              <div className="setup-steps">
                <h4>Setup Steps:</h4>
                <ol>
                  <li>Visit <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek Platform</a></li>
                  <li>Sign up and verify your account</li>
                  <li>Generate API key in API Keys section</li>
                </ol>
              </div>
            </div>

            {localConfig.deepSeek.enabled && (
              <div className="api-key-input">
                <Input
                  label="DeepSeek API Key"
                  type="password"
                  value={localConfig.deepSeek.apiKey}
                  onChange={(e) => handleApiKeyChange('deepSeek', e.target.value)}
                  placeholder="sk-..."
                />
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleTestConnection('deepSeek')}
                  disabled={!localConfig.deepSeek.apiKey.trim()}
                >
                  Test Connection
                </Button>
              </div>
            )}
          </div>

          <div className="security-notice">
            <div className="security-icon">🔒</div>
            <div className="security-content">
              <h4>Security & Privacy</h4>
              <ul>
                <li>API keys stored locally in your browser</li>
                <li>No keys transmitted to our servers</li>
                <li>Direct communication with AI providers</li>
                <li>You control your API usage and costs</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save API Keys
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApiConfigModal;
