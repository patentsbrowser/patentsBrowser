import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../Redux/hooks';
import { RootState } from '../../Redux/store';
import './SmartSearchModal.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: () => void;
  selectedTypes: { grant: boolean; application: boolean };
  setSelectedTypes: (types: { grant: boolean; application: boolean }) => void;
  filterByFamily: boolean;
  setFilterByFamily: (value: boolean) => void;
}

const SmartSearchModal: React.FC<SmartSearchModalProps> = ({
  isOpen,
  onClose,
  onApplyFilter,
  selectedTypes,
  setSelectedTypes,
  filterByFamily,
  setFilterByFamily
}) => {
  const [filteredPatents, setFilteredPatents] = useState<string[]>([]);

  const { smartSearchResults } = useAppSelector((state: RootState) => state.patents);

  // Initialize with all patent IDs when modal opens
  useEffect(() => {
    if (isOpen && smartSearchResults?.hits?.hits) {
      const allPatents = smartSearchResults.hits.hits.map((hit: any) => 
        hit._source.publication_number || hit._id
      );
      setFilteredPatents(allPatents);
    }
  }, [isOpen, smartSearchResults]);

  // Update filtered patents when filters change
  useEffect(() => {
    if (smartSearchResults && smartSearchResults.hits && smartSearchResults.hits.hits) {
      filterPatents();
    }
  }, [selectedTypes, smartSearchResults, filterByFamily]);

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

  // Function to filter patents by publication type and family_id
  const filterPatents = () => {
    if (!smartSearchResults || !smartSearchResults.hits || !smartSearchResults.hits.hits) {
      setFilteredPatents([]);
      return;
    }

    const hits = smartSearchResults.hits.hits;
    
    // First filter by grant/application type
    const typeFilteredHits = hits.filter((hit: any) => {
      const source = hit._source;
      const kindCode = source.kind_code;
      const publicationType = source.publication_type;

      const isGrant = kindCode?.startsWith('B') || publicationType === 'B';
      const isApplication = kindCode?.startsWith('A') || publicationType === 'A';

      if (selectedTypes.grant && selectedTypes.application) {
        return isGrant || isApplication;
      } else if (selectedTypes.grant) {
        return isGrant;
      } else if (selectedTypes.application) {
        return isApplication;
      }
      return false;
    });

    if (!filterByFamily) {
      // If not filtering by family, show all patent IDs
      const patentIds = typeFilteredHits.map((hit: any) => hit._source.publication_number || hit._id);
      setFilteredPatents(patentIds);
      return;
    }

    // Group patents by family_id
    const familyGroups = new Map<string, any[]>();
    
    typeFilteredHits.forEach((hit: any) => {
      const familyId = hit._source.family_id;
      if (familyId) {
        if (!familyGroups.has(familyId)) {
          familyGroups.set(familyId, []);
        }
        familyGroups.get(familyId)?.push(hit);
      }
    });

    // For each family, select the preferred patent (US if available)
    const selectedPatents: string[] = [];
    
    familyGroups.forEach((patents) => {
      // Select the first patent in the family
      selectedPatents.push(patents[0]._source.publication_number || patents[0]._id);
    });

    setFilteredPatents(selectedPatents);
  };

  // Handle filter type change
  const handleTypeChange = (type: 'grant' | 'application') => {
    setSelectedTypes({
      ...selectedTypes,
      [type]: !selectedTypes[type]
    });
  };

  const handleApplyFilter = () => {
    onApplyFilter();
    onClose();
  };

  // Check if any filter options are selected and if there are any filtered patents
  const isFilterValid = (selectedTypes.grant || selectedTypes.application) && filteredPatents.length > 0;

  return (
    <div className="smart-search-modal-overlay">
      <div className="smart-search-modal">
        <div className="modal-header">
          <h3>
            <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px', color: '#c77dff' }} />
            Patent IDs ({filteredPatents.length})
          </h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="filter-options">
            <h4>Filter Options</h4>
            <div className="filter-controls">
              <label className="filter-label">
                <input
                  type="checkbox"
                  checked={selectedTypes.grant}
                  onChange={() => handleTypeChange('grant')}
                />
                Grant Patents
              </label>
              <label className="filter-label">
                <input
                  type="checkbox"
                  checked={selectedTypes.application}
                  onChange={() => handleTypeChange('application')}
                />
                Application Patents
              </label>
            </div>
            <div className="filter-controls" style={{ marginTop: '16px' }}>
              <label className="filter-label">
                <input
                  type="checkbox"
                  checked={filterByFamily}
                  onChange={(e) => setFilterByFamily(e.target.checked)}
                />
                Show one patent per family
              </label>
            </div>
          </div>
          
          <div className="patent-list">
            {filteredPatents.length === 0 ? (
              <div className="no-results">
                <p>No patents found matching the selected filter criteria.</p>
              </div>
            ) : (
              <div className="patents-grid">
                {filteredPatents.map((patentId) => (
                  <div key={patentId} className="patent-card">
                    <div className="patent-id">{patentId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: '6px' }} />
            Cancel
          </button>
          <button 
            className="apply-button" 
            onClick={handleApplyFilter}
            disabled={!isFilterValid}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartSearchModal; 