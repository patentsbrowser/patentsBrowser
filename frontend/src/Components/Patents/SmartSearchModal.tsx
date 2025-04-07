import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { RootState } from '../../Redux/store';
import { setFilters } from '../../Redux/slices/patentSlice';
import './SmartSearchModal.scss';
import { patentApi } from '../../api/patents';

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  patentIds: string[];
  onSearch: (selectedIds: string[]) => void;
  selectedApi: 'serpapi' | 'unified';
}

const SmartSearchModal: React.FC<SmartSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  patentIds, 
  onSearch,
  selectedApi
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'family' | 'grant' | 'application'>('family');
  const [isLoading, setIsLoading] = useState(false);
  const [filteredPatentIds, setFilteredPatentIds] = useState<string[]>([...patentIds]);
  
  const dispatch = useAppDispatch();
  const { patents } = useAppSelector((state: RootState) => state.patents);

  if (!isOpen) return null;

  const formatPatentId = (patentId: string): string => {
    if (selectedApi === 'serpapi') {
      return patentId.replace(/[-]/g, '');
    }
    return patentId;
  };

  // Function to get country code from patent ID
  const getCountryCode = (patentId: string): string => {
    const match = patentId.match(/^([A-Z]{2})-/);
    return match ? match[1] : '';
  };

  // Function to filter patents by family ID and prioritize US patents
  const filterByFamilyId = async () => {
    setIsLoading(true);
    try {
      // Get family information for all patents
      const familyData = await Promise.all(
        patentIds.map(async (id) => {
          try {
            const result = await patentApi.searchPatents(id, selectedApi);
            return {
              patentId: id,
              familyId: result._source?.family_id || '',
              countryCode: getCountryCode(id),
              publicationType: result._source?.type || ''
            };
          } catch (error) {
            console.error(`Error fetching family data for ${id}:`, error);
            return null;
          }
        })
      );

      // Group patents by family ID
      const familyGroups = familyData.reduce((groups: any, patent) => {
        if (!patent) return groups;
        const { familyId, patentId, countryCode, publicationType } = patent;
        if (!groups[familyId]) {
          groups[familyId] = [];
        }
        groups[familyId].push({ patentId, countryCode, publicationType });
        return groups;
      }, {});

      // For each family, prioritize US patents or take the first one
      const selectedPatents = Object.values(familyGroups).map((group: any) => {
        const patents = group as Array<{ patentId: string; countryCode: string }>;
        const usPatent = patents.find(p => p.countryCode === 'US');
        return usPatent ? usPatent.patentId : patents[0].patentId;
      });

      setFilteredPatentIds(selectedPatents);
    } catch (error) {
      console.error('Error filtering by family ID:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to filter patents by publication type
  const filterByPublicationType = async (type: 'grant' | 'application') => {
    setIsLoading(true);
    try {
      const filteredIds = await Promise.all(
        patentIds.map(async (id) => {
          try {
            const result = await patentApi.searchPatents(id, selectedApi);
            const publicationType = result._source?.type?.toLowerCase() || '';
            return {
              patentId: id,
              isMatch: type === 'grant' ? 
                publicationType.includes('grant') : 
                publicationType.includes('application')
            };
          } catch (error) {
            console.error(`Error fetching publication type for ${id}:`, error);
            return { patentId: id, isMatch: false };
          }
        })
      );

      setFilteredPatentIds(filteredIds.filter(p => p.isMatch).map(p => p.patentId));
    } catch (error) {
      console.error('Error filtering by publication type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = async (filter: 'family' | 'grant' | 'application') => {
    setSelectedFilter(filter);
    
    if (filter === 'family') {
      await filterByFamilyId();
      dispatch(setFilters({
        showGrantPatents: true,
        showApplicationPatents: true,
        filterByFamilyId: true
      }));
    } else if (filter === 'grant') {
      await filterByPublicationType('grant');
      dispatch(setFilters({
        showGrantPatents: true,
        showApplicationPatents: false,
        filterByFamilyId: false
      }));
    } else {
      await filterByPublicationType('application');
      dispatch(setFilters({
        showGrantPatents: false,
        showApplicationPatents: true,
        filterByFamilyId: false
      }));
    }
  };

  const handleSearch = () => {
    if (filteredPatentIds.length === 0) return;
    const formattedIds = filteredPatentIds.map(id => formatPatentId(id));
    onSearch(formattedIds);
    onClose();
  };

  return (
    <div className="smart-search-modal-overlay">
      <div className="smart-search-modal">
        <div className="modal-header">
          <h3>Smart Patent Search</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="filter-options">
            <h4>Filter Options</h4>
            <div className="filter-controls">
              <label className="filter-label">
                <input
                  type="radio"
                  checked={selectedFilter === 'family'}
                  onChange={() => handleFilterChange('family')}
                  name="filter-type"
                />
                Filter by Family ID
              </label>
              <label className="filter-label">
                <input
                  type="radio"
                  checked={selectedFilter === 'grant'}
                  onChange={() => handleFilterChange('grant')}
                  name="filter-type"
                />
                Show Grant Patents
              </label>
              <label className="filter-label">
                <input
                  type="radio"
                  checked={selectedFilter === 'application'}
                  onChange={() => handleFilterChange('application')}
                  name="filter-type"
                />
                Show Application Patents
              </label>
            </div>
          </div>
          
          <div className="patent-list">
            {isLoading ? (
              <p className="loading-text">Filtering patents...</p>
            ) : filteredPatentIds.length === 0 ? (
              <p className="no-patents">No matching patents found.</p>
            ) : (
              <div className="filtered-patents">
                <h4>Selected Patents:</h4>
                {filteredPatentIds.map((patentId) => (
                  <div key={patentId} className="patent-item">
                    <span className="patent-id">{patentId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button 
            className="search-button" 
            onClick={handleSearch}
            disabled={filteredPatentIds.length === 0 || isLoading}
          >
            {isLoading ? 'Filtering...' : `Search Patents (${filteredPatentIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartSearchModal; 