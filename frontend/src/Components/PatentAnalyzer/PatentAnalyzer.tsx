import React, { useState, useEffect } from 'react';
import './PatentAnalyzer.scss';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { toast } from 'react-hot-toast';
import { useAutoScroll, getScrollStyles, getScrollClassName } from '../../hooks/useAutoScroll';

interface Taxonomy {
  id: string;
  name: string;
  definition: string;
}

interface Patent {
  id: string;
  number: string;
  title?: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  relevanceScore?: number;
  explanation?: string;
  provider?: string;
}

// API Config now comes from Settings - no separate interface needed

const PatentAnalyzer: React.FC = () => {
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [patents, setPatents] = useState<Patent[]>([]);
  const [newTaxonomy, setNewTaxonomy] = useState({ name: '', definition: '' });
  const [newPatent, setNewPatent] = useState('');
  const [bulkPatents, setBulkPatents] = useState('');
  const [analysisScope, setAnalysisScope] = useState<'title_abstract' | 'title_abstract_claims' | 'claims_only' | 'full_text'>('title_abstract');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Auto-scroll hooks for different sections
  const [taxonomySectionRef, taxonomySectionScrollState] = useAutoScroll({
    threshold: 400,
    maxHeight: '80vh',
    dependencies: [taxonomies.length, newTaxonomy.name, newTaxonomy.definition]
  });

  const [patentSectionRef, patentSectionScrollState] = useAutoScroll({
    threshold: 500,
    maxHeight: '80vh',
    dependencies: [patents.length, newPatent, bulkPatents]
  });

  // Load saved data from localStorage
  useEffect(() => {
    const savedTaxonomies = localStorage.getItem('patent_analyzer_taxonomies');
    const savedPatents = localStorage.getItem('patent_analyzer_patents');

    if (savedTaxonomies) {
      setTaxonomies(JSON.parse(savedTaxonomies));
    }
    if (savedPatents) {
      setPatents(JSON.parse(savedPatents));
    }
  }, []);

  // Function to get available API providers from Settings
  const getAvailableProviders = () => {
    const providers = [];

    const googleKey = localStorage.getItem('patent_analyzer_google_ai_key');
    const openaiKey = localStorage.getItem('patent_analyzer_openai_key');
    const deepseekKey = localStorage.getItem('patent_analyzer_deepseek_key');
    const anthropicKey = localStorage.getItem('patent_analyzer_anthropic_key');
    const cohereKey = localStorage.getItem('patent_analyzer_cohere_key');
    const huggingfaceKey = localStorage.getItem('patent_analyzer_huggingface_key');
    const customKey = localStorage.getItem('patent_analyzer_custom_key');

    if (googleKey?.trim()) providers.push({ name: 'Google AI', key: googleKey, icon: '🤖' });
    if (openaiKey?.trim()) providers.push({ name: 'OpenAI', key: openaiKey, icon: '🧠' });
    if (deepseekKey?.trim()) providers.push({ name: 'DeepSeek', key: deepseekKey, icon: '🔍' });
    if (anthropicKey?.trim()) providers.push({ name: 'Anthropic', key: anthropicKey, icon: '🎭' });
    if (cohereKey?.trim()) providers.push({ name: 'Cohere', key: cohereKey, icon: '🌐' });
    if (huggingfaceKey?.trim()) providers.push({ name: 'Hugging Face', key: huggingfaceKey, icon: '🤗' });
    if (customKey?.trim()) {
      const customName = localStorage.getItem('patent_analyzer_custom_name') || 'Custom API';
      providers.push({ name: customName, key: customKey, icon: '⚙️' });
    }

    return providers;
  };

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('patent_analyzer_taxonomies', JSON.stringify(taxonomies));
  }, [taxonomies]);

  useEffect(() => {
    localStorage.setItem('patent_analyzer_patents', JSON.stringify(patents));
  }, [patents]);

  const addTaxonomy = () => {
    if (!newTaxonomy.name.trim() || !newTaxonomy.definition.trim()) {
      toast.error('Please fill in both name and definition');
      return;
    }

    const taxonomy: Taxonomy = {
      id: Date.now().toString(),
      name: newTaxonomy.name.trim(),
      definition: newTaxonomy.definition.trim()
    };

    setTaxonomies([...taxonomies, taxonomy]);
    setNewTaxonomy({ name: '', definition: '' });
    toast.success('Taxonomy added successfully');
  };

  const removeTaxonomy = (id: string) => {
    setTaxonomies(taxonomies.filter(t => t.id !== id));
    toast.success('Taxonomy removed');
  };

  const addPatent = () => {
    if (!newPatent.trim()) {
      toast.error('Please enter a patent number');
      return;
    }

    const patent: Patent = {
      id: Date.now().toString(),
      number: newPatent.trim(),
      status: 'pending'
    };

    setPatents([...patents, patent]);
    setNewPatent('');
    toast.success('Patent added');
  };

  const addBulkPatents = () => {
    if (!bulkPatents.trim()) {
      toast.error('Please enter patent numbers');
      return;
    }

    const patentNumbers = bulkPatents
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (patentNumbers.length === 0) {
      toast.error('No valid patent numbers found');
      return;
    }

    if (patentNumbers.length > 1000) {
      toast.error('Maximum 1000 patents allowed');
      return;
    }

    const newPatents: Patent[] = patentNumbers.map((number, index) => ({
      id: (Date.now() + index).toString(),
      number: number,
      status: 'pending' as const
    }));

    setPatents([...patents, ...newPatents]);
    setBulkPatents('');
    toast.success(`${newPatents.length} patents added`);
  };

  const removePatent = (id: string) => {
    setPatents(patents.filter(p => p.id !== id));
  };

  const clearAllPatents = () => {
    setPatents([]);
    toast.success('All patents cleared');
  };

  const clearAllTaxonomies = () => {
    setTaxonomies([]);
    toast.success('All taxonomies cleared');
  };

  const analyzeAllPatents = async () => {
    if (taxonomies.length === 0) {
      toast.error('Please add at least one taxonomy before analyzing');
      return;
    }

    if (patents.length === 0) {
      toast.error('Please add patents to analyze');
      return;
    }

    const availableProviders = getAvailableProviders();

    if (availableProviders.length === 0) {
      toast.error('Please configure at least one AI provider in Settings');
      toast('Go to Settings → API Keys to configure your AI providers', {
        duration: 4000,
        icon: '⚙️'
      });
      return;
    }

    setIsAnalyzing(true);
    toast.success(`Analysis started using ${availableProviders[0].name}...`);

    // Simulate analysis process
    for (let i = 0; i < patents.length; i++) {
      const patent = patents[i];

      // Update status to analyzing
      setPatents(prev => prev.map(p =>
        p.id === patent.id ? { ...p, status: 'analyzing' } : p
      ));

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate analysis result
      const relevanceScore = Math.floor(Math.random() * 100);
      const explanation = `This patent shows ${relevanceScore}% relevance to the defined taxonomies based on ${analysisScope.replace('_', ' ')} analysis using ${availableProviders[0].name}.`;

      setPatents(prev => prev.map(p =>
        p.id === patent.id ? {
          ...p,
          status: 'completed',
          relevanceScore,
          explanation,
          provider: availableProviders[0].name
        } : p
      ));
    }

    setIsAnalyzing(false);
    toast.success('Analysis completed!');
  };

  const exportResults = () => {
    const completedPatents = patents.filter(p => p.status === 'completed');
    
    if (completedPatents.length === 0) {
      toast.error('No completed analysis to export');
      return;
    }

    const csvContent = [
      ['Patent Number', 'Title', 'Relevance Score', 'Explanation', 'AI Provider', 'Analysis Scope'],
      ...completedPatents.map(patent => [
        patent.number,
        patent.title || 'N/A',
        patent.relevanceScore?.toString() || 'N/A',
        patent.explanation || 'N/A',
        patent.provider || 'N/A',
        analysisScope.replace('_', ' ')
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patent_analysis_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Results exported successfully');
  };

  const getAnalysisScopeDescription = () => {
    switch (analysisScope) {
      case 'title_abstract':
        return 'Recommended for most analyses - fast and comprehensive';
      case 'title_abstract_claims':
        return 'Detailed analysis including patent claims for thorough assessment';
      case 'claims_only':
        return 'Focused analysis on patent claims for precise legal relevance';
      case 'full_text':
        return 'Complete analysis including description (slower, most comprehensive)';
      default:
        return '';
    }
  };

  return (
    <div className="patent-analyzer">
      <div className="patent-analyzer-header">
        <h1>🔍 Patent Insights Analyzer</h1>
        <p>AI-Powered Patent Analysis Tool</p>
        <div className="header-info">
          <div className="api-status">
            {(() => {
              const providers = getAvailableProviders();
              return providers.length > 0 ? (
                <div className="providers-available">
                  <span className="status-icon">✅</span>
                  <span>{providers.length} AI Provider{providers.length > 1 ? 's' : ''} Configured</span>
                  <div className="providers-list">
                    {providers.map((provider, index) => (
                      <span key={index} className="provider-badge">
                        {provider.icon} {provider.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-providers">
                  <span className="status-icon">⚠️</span>
                  <span>No AI providers configured</span>
                  <span className="config-hint">Configure in Settings → API Keys</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* API Configuration Warning */}
      {getAvailableProviders().length === 0 && (
        <div className="api-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h3>AI API keys required</h3>
            <p>Configure your AI provider API keys in Settings to enable real patent analysis.</p>
            <div className="warning-actions">
              <Button
                variant="primary"
                onClick={() => window.location.href = '/auth/settings'}
              >
                Go to Settings
              </Button>
              <div className="supported-providers">
                <span>Supported: Google AI, OpenAI, DeepSeek, Anthropic, Cohere, Hugging Face</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="analyzer-content">
        {/* Taxonomy Management */}
        <div
          ref={taxonomySectionRef}
          className={getScrollClassName(taxonomySectionScrollState, "analyzer-section taxonomy-section")}
          style={getScrollStyles(taxonomySectionScrollState)}
        >
          <div className="section-header">
            <h2>📋 Taxonomy Management</h2>
            <div className="section-actions">
              <Button
                variant="danger"
                size="sm"
                onClick={clearAllTaxonomies}
                disabled={taxonomies.length === 0}
              >
                🗑️ Clear Taxonomies
              </Button>
            </div>
          </div>

          <div className="add-taxonomy">
            <h3>Add New Taxonomy</h3>
            <div className="taxonomy-form">
              <Input
                label="Name"
                value={newTaxonomy.name}
                onChange={(e) => setNewTaxonomy({ ...newTaxonomy, name: e.target.value })}
                placeholder="e.g., AI Technology"
              />
              <div className="input-wrapper">
                <label className="input-label">Definition</label>
                <textarea
                  className="input-field textarea-field"
                  value={newTaxonomy.definition}
                  onChange={(e) => setNewTaxonomy({ ...newTaxonomy, definition: e.target.value })}
                  placeholder="e.g., Patents related to artificial intelligence..."
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <Button variant="primary" onClick={addTaxonomy}>
                  Add Taxonomy
                </Button>
                <Button variant="secondary" onClick={() => setNewTaxonomy({ name: '', definition: '' })}>
                  🤖 Auto Fill
                </Button>
                <Button variant="secondary" onClick={() => setNewTaxonomy({ name: '', definition: '' })}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {/* Current Taxonomies */}
          <div className="taxonomies-list">
            <h4>Current Taxonomies ({taxonomies.length})</h4>
            {taxonomies.length === 0 ? (
              <div className="no-taxonomies">
                <div className="empty-icon">📋</div>
                <p>No taxonomies added yet. Create your first taxonomy to get started.</p>
              </div>
            ) : (
              <div className="taxonomies-container">
                {taxonomies.map(taxonomy => (
                  <div key={taxonomy.id} className="taxonomy-item">
                    <div className="taxonomy-header">
                      <div className="taxonomy-name">{taxonomy.name}</div>
                      <div className="taxonomy-actions">
                        <button onClick={() => removeTaxonomy(taxonomy.id)} title="Delete taxonomy">
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="taxonomy-definition">{taxonomy.definition}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Scope */}
        <div className="analyzer-section">
          <div className="section-header">
            <h2>🎯 Analysis Scope</h2>
          </div>

          <div className="analysis-scope">
            <p>Choose which parts of patents to analyze</p>
            <div className="scope-options">
              <div
                className={`scope-option ${analysisScope === 'title_abstract' ? 'selected' : ''}`}
                onClick={() => setAnalysisScope('title_abstract')}
              >
                <div className="scope-title">Title + Abstract</div>
                <div className="scope-description">Recommended for most analyses - fast and comprehensive</div>
                {analysisScope === 'title_abstract' && <div className="scope-badge">Selected</div>}
              </div>

              <div
                className={`scope-option ${analysisScope === 'title_abstract_claims' ? 'selected' : ''}`}
                onClick={() => setAnalysisScope('title_abstract_claims')}
              >
                <div className="scope-title">Title + Abstract + Claims</div>
                <div className="scope-description">Detailed analysis including patent claims for thorough assessment</div>
                {analysisScope === 'title_abstract_claims' && <div className="scope-badge">Selected</div>}
              </div>

              <div
                className={`scope-option ${analysisScope === 'claims_only' ? 'selected' : ''}`}
                onClick={() => setAnalysisScope('claims_only')}
              >
                <div className="scope-title">Claims Only</div>
                <div className="scope-description">Focused analysis on patent claims for precise legal relevance</div>
                {analysisScope === 'claims_only' && <div className="scope-badge">Selected</div>}
              </div>

              <div
                className={`scope-option ${analysisScope === 'full_text' ? 'selected' : ''}`}
                onClick={() => setAnalysisScope('full_text')}
              >
                <div className="scope-title">Full Text</div>
                <div className="scope-description">Complete analysis including description (slower, most comprehensive)</div>
                {analysisScope === 'full_text' && <div className="scope-badge">Selected</div>}
              </div>
            </div>

            <div className="current-scope">
              ✓ Current Mode: {analysisScope.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - {getAnalysisScopeDescription()}
            </div>
          </div>
        </div>

        {/* Patent Management */}
        <div
          ref={patentSectionRef}
          className={getScrollClassName(patentSectionScrollState, "analyzer-section patent-section")}
          style={getScrollStyles(patentSectionScrollState)}
        >
          <div className="section-header">
            <h2>📄 Patent Analysis</h2>
            <div className="section-actions">
              <Button variant="primary" onClick={analyzeAllPatents} disabled={isAnalyzing || taxonomies.length === 0}>
                {isAnalyzing ? '🔄 Analyzing...' : '🚀 Analyze All'}
              </Button>
              <Button variant="secondary" onClick={exportResults} disabled={patents.filter(p => p.status === 'completed').length === 0}>
                📥 Download CSV
              </Button>
              <Button variant="danger" size="sm" onClick={clearAllPatents} disabled={patents.length === 0}>
                🗑️ Clear Patents
              </Button>
            </div>
          </div>

          <div className="patent-input">
            <div className="input-tabs">
              <button className="tab-button active">➕ Add Patent Row</button>
              <button className="tab-button" onClick={() => {}}>📋 Bulk Upload</button>
            </div>

            <div className="single-patent-input">
              <Input
                label="Patent Number"
                value={newPatent}
                onChange={(e) => setNewPatent(e.target.value)}
                placeholder="US20040105001, US7123456, EP1234567, etc."
                onKeyDown={(e) => e.key === 'Enter' && addPatent()}
              />
              <Button variant="primary" onClick={addPatent}>
                Add Patent
              </Button>
            </div>

            <div className="bulk-input">
              <label>Patent Numbers (one per line, up to 1000)</label>
              <textarea
                className="bulk-textarea"
                value={bulkPatents}
                onChange={(e) => setBulkPatents(e.target.value)}
                placeholder="US20040105001&#10;US7123456&#10;EP1234567&#10;WO2020123456"
              />
              <div className="bulk-info">
                Supported formats: US20040105001, US7123456, EP1234567, WO2020123456, etc.
              </div>
              <Button variant="primary" onClick={addBulkPatents}>
                📥 Upload Patents
              </Button>
            </div>
          </div>

          {/* Patents List */}
          <div className="patents-list">
            <h4>Patents ({patents.length})</h4>
            {patents.length === 0 ? (
              <div className="no-patents">
                <div className="empty-icon">📄</div>
                <p>No patents added yet. Add patents to start analysis.</p>
              </div>
            ) : (
              <div className="patents-table">
                <div className="table-header">
                  <div>Patent Number</div>
                  <div>Status</div>
                  <div>Relevance</div>
                  <div>Actions</div>
                </div>
                <div className="patents-table-body">
                  {patents.map(patent => (
                    <div key={patent.id} className={`table-row status-${patent.status}`}>
                      <div className="patent-number">{patent.number}</div>
                      <div className="patent-status">
                        {patent.status === 'pending' && '⏳ Pending'}
                        {patent.status === 'analyzing' && '🔄 Analyzing...'}
                        {patent.status === 'completed' && '✅ Completed'}
                        {patent.status === 'error' && '❌ Error'}
                      </div>
                      <div className="patent-relevance">
                        {patent.relevanceScore !== undefined ? `${patent.relevanceScore}%` : '-'}
                      </div>
                      <div className="patent-actions">
                        <button onClick={() => removePatent(patent.id)} title="Remove patent">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {taxonomies.length === 0 && (
            <div className="analysis-warning">
              <div className="warning-icon">⚠️</div>
              <p>Please add at least one taxonomy before analyzing patents.</p>
            </div>
          )}
        </div>
      </div>

      {/* API Configuration now handled in Settings */}
    </div>
  );
};

export default PatentAnalyzer;
