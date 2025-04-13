import React, { useRef, useEffect } from 'react';
import { ApiSource } from './types';
import { useWindowSize } from './utils';
import toast from 'react-hot-toast';
import PatentFigureSearch from './PatentFigureSearch';

interface PatentSearchFormProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  patentIds: string[];
  setPatentIds: (ids: string[]) => void;
  isLoading: boolean;
  selectedApi: ApiSource;
  setSelectedApi: (api: ApiSource) => void;
  searchType: 'full' | 'smart';
  setSearchType: (type: 'full' | 'smart') => void;
  setShowSmartSearchModal: (show: boolean) => void;
  onSearch: (ids: string[]) => void;
  formatPatentId: (id: string, apiType: ApiSource) => string;
  selectedFilter?: 'grant' | 'application';
  setSelectedFilter?: (filter: 'grant' | 'application') => void;
}

const PatentSearchForm: React.FC<PatentSearchFormProps> = ({
  searchQuery,
  setSearchQuery,
  patentIds,
  setPatentIds,
  isLoading,
  selectedApi,
  setSelectedApi,
  searchType,
  setSearchType,
  setShowSmartSearchModal,
  onSearch,
  formatPatentId,
  selectedFilter = 'grant',
  setSelectedFilter
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  // Detect theme changes and update select element
  useEffect(() => {
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    if (selectRef.current) {
      selectRef.current.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    }
    
    // Optional: Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          if (selectRef.current) {
            selectRef.current.setAttribute('data-theme', isDark ? 'dark' : 'light');
          }
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Process patent IDs using the same function as PatentSearch
    const processPatentIds = (input: string): string[] => {
      // First split by newlines
      const lines = input.split(/\n/);
      
      // Process each line - split by commas or spaces if present
      const processedIds = lines.flatMap(line => 
        line
          .split(/[,\s]+/)
          .map(id => id.trim())
          .filter(id => id)
      );

      // Remove duplicates and empty strings
      return [...new Set(processedIds)].filter(Boolean);
    };

    const inputPatentIds = processPatentIds(value);
    if (inputPatentIds.length > 0) {
      setPatentIds(inputPatentIds);
    } else {
      setPatentIds([]);
    }
  };

  const handleSearchTypeChange = (type: 'full' | 'smart') => {
    setSearchType(type);
    // Clear the search query and patent IDs when switching search types
    setSearchQuery('');
    setPatentIds([]);
  };

  const handleApiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedApi(e.target.value as ApiSource);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a patent ID');
      return;
    }

    // For patentIds list (multiple IDs detected) or single unified patent
    const idsToSearch = patentIds.length > 0 ? patentIds : [searchQuery];
    
    // Format the patent IDs
    const formattedIds = idsToSearch.map(id => formatPatentId(id, selectedApi));
    
    // If smart search is selected, open the modal after making API call
    if (searchType === 'smart' && selectedApi === 'unified') {
      // First, make the API call to load the data
      onSearch(formattedIds);
      
      // Then show the modal to filter the results
      setShowSmartSearchModal(true);
      return;
    }
    
    // For direct search, just call onSearch
    onSearch(formattedIds);
  };

  return (
    <form 
      onSubmit={handleSearch} 
      className="search-form" 
      style={{
        maxWidth: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div 
        className="search-controls"
        style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '0.75rem' : '1rem',
          marginBottom: '0.5rem',
          alignItems: 'flex-start',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: isMobile ? '100%' : '180px',
        }}>
          <select 
            value={selectedApi}
            onChange={handleApiChange}
            className="api-select"
            data-theme="light"
            ref={selectRef}
            style={{ 
              width: '100%',
              height: '40px',
              marginBottom: '8px'
            }}
          >
            <option value="unified">Unified Patents Database</option>
            <option value="serpapi">Google Patents (SerpAPI)</option>
          </select>
          <div className="search-type-selector" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 4px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="searchType"
                checked={searchType === 'full'}
                onChange={() => handleSearchTypeChange('full')}
              />
              Full Search
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="searchType"
                checked={searchType === 'smart'}
                onChange={() => handleSearchTypeChange('smart')}
              />
              Smart Search
            </label>
          </div>
        </div>
        <div 
          className="search-input-container" 
          ref={dropdownRef}
          style={{ 
            flex: '1', 
            minWidth: '200px',
            maxWidth: isMobile ? '100%' : 'calc(100% - 320px)'
          }}
        >
          <textarea
            value={searchQuery}
            onChange={handleInputChange}
            placeholder={searchType === 'full' 
              ? "Enter patent numbers (separated by commas, spaces, or new lines)" 
              : "Enter keywords, inventor name, assignee, or other search terms"}
            className="search-input patent-textarea"
            rows={3}
            style={{ 
              width: '100%',
              minHeight: '80px',
              resize: 'vertical',
              boxSizing: 'border-box',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              border: '1px solid var(--border-color)'
            }}
          />
          {searchType === 'full' && patentIds.length > 0 && (
            <div className="patent-ids-preview">
              {patentIds.map((id, index) => (
                <div key={index} className="patent-id-tag">
                  {id}
                </div>
              ))}
            </div>
          )}
          {searchType === 'smart' && (
            <small className="helper-text" style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>
              Smart search enables you to find patents using keywords, inventors, assignees, and more.
            </small>
          )}
        </div>
        <button 
          type="submit" 
          disabled={
            isLoading || 
            !searchQuery.trim()
          }
          style={{ 
            width: isMobile ? '100%' : 'auto',
            minWidth: '120px',
            height: '40px',
            marginTop: isMobile ? '0.5rem' : '0',
            padding: '0 1rem',
            flexShrink: 0,
            backgroundColor: 'var(--accent-color)',
            color: 'var(--button-text)',
            border: 'none',
            borderRadius: '4px',
            cursor: !isLoading && searchQuery.trim() ? 'pointer' : 'not-allowed',
            opacity: isLoading || !searchQuery.trim() ? 0.7 : 1
          }}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
      {searchType === 'full' && patentIds.length > 0 && (
        <small className="helper-text">
          {patentIds.length} patent ID{patentIds.length > 1 ? 's' : ''} detected. 
          Click Search to view results.
        </small>
      )}
      
      {/* Add Patent Figure Search Component */}
      {searchType === 'full' && (
        <PatentFigureSearch patentIds={patentIds} />
      )}
    </form>
  );
};

export default PatentSearchForm; 