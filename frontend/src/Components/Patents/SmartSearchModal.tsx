import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { RootState } from '../../Redux/store';
import './SmartSearchModal.scss';
import { toast } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilter, 
  faSearch, 
  faSortAmountDown, 
  faTimesCircle, 
  faStar, 
  faCalendarAlt,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilter: 'grant' | 'application';
  setSelectedFilter: (filter: 'grant' | 'application') => void;
  onApplyFilter: () => void;
}

const SmartSearchModal: React.FC<SmartSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedFilter,
  setSelectedFilter,
  onApplyFilter
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [filteredPatents, setFilteredPatents] = useState<any[]>([]);
  const [sortCriteria, setSortCriteria] = useState<'score' | 'date'>('score');
  
  const dispatch = useAppDispatch();
  const { smartSearchResults } = useAppSelector((state: RootState) => state.patents);

  useEffect(() => {
    if (smartSearchResults && smartSearchResults.hits && smartSearchResults.hits.hits) {
      filterPatents(selectedFilter);
    }
  }, [selectedFilter, smartSearchResults, sortCriteria]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Function to filter patents by publication type
  const filterPatents = (type: 'grant' | 'application') => {
    if (!smartSearchResults || !smartSearchResults.hits || !smartSearchResults.hits.hits) {
      setFilteredPatents([]);
      return;
    }

    setIsLoading(true);

    try {
      // Get the hits array from the results
      const hits = smartSearchResults.hits.hits;
      console.log(`Filtering ${hits.length} patents by type: ${type}`);

      const filteredHits = hits.filter((hit: any) => {
        const source = hit._source;
        const kindCode = source.kind_code;
        const publicationType = source.publication_type;

        if (type === 'grant') {
          // Filter for granted patents (B, B1, B2)
          return kindCode?.startsWith('B') || publicationType === 'B';
        } else {
          // Filter for applications (A, A1, A2)
          return kindCode?.startsWith('A') || publicationType === 'A';
        }
      });

      // Sort the filtered hits
      const sortedHits = [...filteredHits].sort((a, b) => {
        if (sortCriteria === 'score') {
          return (b._source.portfolio_score || 0) - (a._source.portfolio_score || 0);
        } else {
          // Sort by publication date (newest first)
          const dateA = new Date(a._source.publication_date || 0).getTime();
          const dateB = new Date(b._source.publication_date || 0).getTime();
          return dateB - dateA;
        }
      });

      console.log(`Found ${sortedHits.length} ${type} patents`);
      setFilteredPatents(sortedHits);
    } catch (error) {
      console.error('Error filtering patents:', error);
      toast.error('Error filtering patents');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: 'grant' | 'application') => {
    setSelectedFilter(filter);
  };

  const handleApplyFilter = () => {
    // Apply the filter and close the modal
    console.log(`Applying filter for ${filteredPatents.length} patents with type: ${selectedFilter}`);
    onApplyFilter();
    onClose();
  };

  // Function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Handle cancel button click
  const handleCancel = () => {
    console.log("Cancelling smart search modal");
    onClose();
  };

  return (
    <div className="smart-search-modal-overlay">
      <div className="smart-search-modal" style={{ backgroundColor: '#1e1e1e' }}>
        <div className="modal-header" style={{ backgroundColor: '#252525', borderBottom: '1px solid #333' }}>
          <h3>
            <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px', color: '#c77dff' }} />
            Smart Patent Search Results
          </h3>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="modal-content" style={{ backgroundColor: '#1e1e1e' }}>
          <div className="filter-options">
            <h4>
              <FontAwesomeIcon icon={faFilter} style={{ marginRight: '6px', color: '#c77dff' }} />
              Filter Options
            </h4>
            <div className="filter-controls" style={{ backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '6px' }}>
              <label className="filter-label">
                <input
                  type="radio"
                  checked={selectedFilter === 'grant'}
                  onChange={() => handleFilterChange('grant')}
                  name="filter-type"
                  style={{ backgroundColor: '#333', borderColor: '#555' }}
                />
                Show Grant Patents (B, B1, B2)
              </label>
              <label className="filter-label">
                <input
                  type="radio"
                  checked={selectedFilter === 'application'}
                  onChange={() => handleFilterChange('application')}
                  name="filter-type"
                  style={{ backgroundColor: '#333', borderColor: '#555' }}
                />
                Show Application Patents (A, A1, A2)
              </label>
            </div>
            
            <div className="sort-controls">
              <h4>
                <FontAwesomeIcon icon={faSortAmountDown} style={{ marginRight: '6px', color: '#c77dff' }} />
                Sort By
              </h4>
              <div style={{ display: 'flex', gap: '12px', backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '6px' }}>
                <label className="filter-label">
                  <input
                    type="radio"
                    checked={sortCriteria === 'score'}
                    onChange={() => setSortCriteria('score')}
                    name="sort-criteria"
                    style={{ backgroundColor: '#333', borderColor: '#555' }}
                  />
                  <FontAwesomeIcon icon={faStar} style={{ marginRight: '4px', color: '#c77dff' }} />
                  Portfolio Score
                </label>
                <label className="filter-label">
                  <input
                    type="radio"
                    checked={sortCriteria === 'date'}
                    onChange={() => setSortCriteria('date')}
                    name="sort-criteria"
                    style={{ backgroundColor: '#333', borderColor: '#555' }}
                  />
                  <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '4px', color: '#c77dff' }} />
                  Publication Date
                </label>
              </div>
            </div>
          </div>
          
          <div className="patent-list">
            {isLoading ? (
              <p className="loading-text">Filtering patents...</p>
            ) : filteredPatents.length === 0 ? (
              <div className="no-results">
                <p>No patents found matching the selected filter criteria.</p>
                <p>Try selecting a different filter option.</p>
              </div>
            ) : (
              <>
                <div className="filter-message" style={{ 
                  margin: '0 0 20px 0', 
                  padding: '12px', 
                  backgroundColor: 'rgba(199, 125, 255, 0.1)', 
                  borderRadius: '8px',
                  border: '1px solid #c77dff',
                  color: '#e0e0e0',
                  textAlign: 'center'
                }}>
                  <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '8px', color: '#c77dff' }} />
                  <span>Found {filteredPatents.length} patents matching your filter. <strong>Click "Apply Filter & Show Patents" below to view the results.</strong></span>
                </div>
                
                <div className="patent-grid">
                  <h4>Patents ({filteredPatents.length}):</h4>
                  <div className="patents-grid">
                    {filteredPatents.map((patent) => (
                      <div key={patent._id} className="patent-card">
                        <div className="patent-id">{patent._id}</div>
                        <div className="patent-title">{truncateText(patent._source.title, 60)}</div>
                        <div className="patent-meta">
                          <span className="patent-type">{patent._source.kind_code || patent._source.publication_type}</span>
                          <span className="patent-score">
                            <FontAwesomeIcon icon={faStar} style={{ marginRight: '3px', fontSize: '0.8em' }} />
                            {patent._source.portfolio_score}
                          </span>
                        </div>
                        <div className="patent-details">
                          <span className="patent-date">
                            <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '3px', fontSize: '0.8em' }} />
                            {formatDate(patent._source.publication_date)}
                          </span>
                          <span className="patent-assignee">
                            {truncateText(patent._source.assignee_current?.[0] || patent._source.assignee_original?.[0] || '', 30)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="modal-footer" style={{ backgroundColor: '#252525', borderTop: '1px solid #333' }}>
          <button className="cancel-button" onClick={handleCancel} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#e0e0e0', border: '1px solid #444' }}>
            <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: '6px' }} />
            Cancel
          </button>
          <button 
            className="apply-button" 
            onClick={handleApplyFilter}
            disabled={filteredPatents.length === 0 || isLoading}
            style={{ backgroundColor: '#c77dff', color: '#000', border: '1px solid #c77dff' }}
          >
            <FontAwesomeIcon icon={faFilter} style={{ marginRight: '6px' }} />
            {isLoading ? 'Filtering...' : `Apply Filter & Show ${filteredPatents.length} Patents`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartSearchModal; 