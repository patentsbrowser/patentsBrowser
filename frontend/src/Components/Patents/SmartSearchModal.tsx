import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../Redux/hooks';
import { RootState } from '../../Redux/store';
import { setFilters, initializeSmartSearchResults } from '../../Redux/slices/patentSlice';
import './SmartSearchModal.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimesCircle, faEdit, faCheck, faExchangeAlt, faCheckCircle, faMagic } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { variationCorrectionForSearch } from '../../utils/patentUtils';
import { patentApi } from '../../api/patents';

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: () => void;
  selectedTypes: { grant: boolean; application: boolean };
  setSelectedTypes: (types: { grant: boolean; application: boolean }) => void;
  filterByFamily: boolean;
  setFilterByFamily: (value: boolean) => void;
  notFoundPatents: string[];
  onPatentSearch: (patentIds: string[]) => Promise<{ success: boolean; foundPatentIds?: Set<string> }>;
  setNotFoundPatents: (patents: string[]) => void;
  setIsLoading: (loading: boolean) => void;
}

const SmartSearchModal: React.FC<SmartSearchModalProps> = ({
  isOpen,
  onClose,
  onApplyFilter,
  notFoundPatents,
  onPatentSearch,
  setNotFoundPatents,
  setIsLoading
}) => {
  const [filteredPatents, setFilteredPatents] = useState<string[]>([]);
  const [editingPatents, setEditingPatents] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);
  const [pendingCorrections, setPendingCorrections] = useState<{ [key: string]: string }>({});
  const [isParsing, setIsParsing] = useState(false);
  const [displayNotFoundPatents, setDisplayNotFoundPatents] = useState<string[]>([]);
  const [foundSearch, setFoundSearch] = useState('');
  const [notFoundSearch, setNotFoundSearch] = useState('');
  const [filterByFamily, setFilterByFamily] = useState(false);
  const [familyFilteredPatents, setFamilyFilteredPatents] = useState<string[]>([]);
  const [isFilteringByFamily, setIsFilteringByFamily] = useState(false);
  
  const dispatch = useAppDispatch();
  const { smartSearchResults } = useAppSelector((state: RootState) => state.patents);

  // Get preferred patent authority from localStorage
  const preferredPatentAuthority = localStorage.getItem('preferredPatentAuthority') || 'US WO EP GB FR DE CH JP RU SU';
  const preferredAuthorities = preferredPatentAuthority.split(' ');

  // Initialize smart search results from IndexedDB when component mounts
  useEffect(() => {
    dispatch(initializeSmartSearchResults());
  }, [dispatch]);

  // Initialize with all patent IDs when modal opens
  useEffect(() => {
    if (isOpen && smartSearchResults?.hits?.hits) {
      const allPatents = smartSearchResults.hits.hits.map((hit: any) => 
        hit._source.publication_number || hit._id
      );
      setFilteredPatents(allPatents);
      // Close loader when we have results
      setIsLoading(false);
    }
  }, [isOpen, smartSearchResults, setIsLoading]);

  // New function to handle filtering by family
  const handleFilterByFamily = async (shouldFilter: boolean) => {
    // Skip if already filtering
    if (isFilteringByFamily) {
      return;
    }
    
    setFilterByFamily(shouldFilter);
    
    if (shouldFilter && smartSearchResults?.hits?.hits) {
      setIsFilteringByFamily(true);
      
      try {
        // Get preferred authorities from localStorage
        const preferredPatentAuthority = localStorage.getItem('preferredPatentAuthority') || 'US WO EP GB FR DE CH JP RU SU';
        const preferredAuthorities = preferredPatentAuthority.split(' ');
        
        // Prepare data for backend API
        const patentsForFiltering = smartSearchResults.hits.hits.map((hit: any) => ({
          patentId: hit._source.publication_number || hit._id,
          familyId: hit._source.family_id || '',
          country: (hit._source.publication_number || hit._id)?.substring(0, 2) || ''
        })).filter((patent: {patentId: string; familyId: string; country: string}) => patent.familyId);
        
        // Call backend API with preferred authorities
        const result = await patentApi.filterPatentsByFamily(patentsForFiltering, preferredAuthorities);
        
        if (result && result.filteredPatents) {
          setFamilyFilteredPatents(result.filteredPatents);
        } else {
          // Fallback to client-side filtering if backend fails
          const familyMap = new Map<string, any[]>();
          
          // Group patents by family ID
          smartSearchResults.hits.hits.forEach((hit: any) => {
            const familyId = hit._source.family_id;
            if (familyId) {
              if (!familyMap.has(familyId)) {
                familyMap.set(familyId, []);
              }
              familyMap.get(familyId)?.push(hit);
            }
          });

          // For each family, select the patent with the highest preferred authority
          const filteredPatents = Array.from(familyMap.values()).map(familyPatents => {
            // Sort patents by preferred authority order
            const sortedPatents = familyPatents.sort((a, b) => {
              const aCountry = a._source.publication_number?.substring(0, 2) || '';
              const bCountry = b._source.publication_number?.substring(0, 2) || '';
              const aIndex = preferredAuthorities.indexOf(aCountry);
              const bIndex = preferredAuthorities.indexOf(bCountry);
              return aIndex - bIndex;
            });

            // Return the patent with the highest preferred authority
            return sortedPatents[0]._source.publication_number || sortedPatents[0]._id;
          });

          setFamilyFilteredPatents(filteredPatents);
        }
      } catch (error) {
        console.error("Error filtering patents by family:", error);
        toast.error("Failed to filter patents by family");
        setFamilyFilteredPatents([]);
      } finally {
        setIsFilteringByFamily(false);
      }
    } else {
      setFamilyFilteredPatents([]);
      setIsFilteringByFamily(false);
    }
  };

  // Save filtered patent IDs to Redux whenever they change
  useEffect(() => {
    const patentsToSave = filterByFamily ? familyFilteredPatents : filteredPatents;
    dispatch(setFilters({ filteredPatentIds: patentsToSave }));
  }, [filteredPatents, familyFilteredPatents, filterByFamily, dispatch]);

  // Update display patents when notFoundPatents changes
  useEffect(() => {
    setDisplayNotFoundPatents(notFoundPatents);
  }, [notFoundPatents]);

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

  const handleApplyFilter = () => {
    onApplyFilter();
    onClose();
  };

  const handleEditPatent = (patentId: string) => {
    setEditingPatents(prev => ({
      ...prev,
      [patentId]: patentId
    }));
  };

  const handleUpdatePatent = (originalId: string, newValue: string) => {
    setEditingPatents(prev => ({
      ...prev,
      [originalId]: newValue
    }));
  };

  const handleConfirmEdit = (patentId: string) => {
    const editedValue = editingPatents[patentId];
    if (editedValue && editedValue.trim() !== '') {
      setPendingCorrections(prev => ({
        ...prev,
        [patentId]: editedValue
      }));
      setEditingPatents(prev => {
        const newState = { ...prev };
        delete newState[patentId];
        return newState;
      });
    }
  };

  const handleParseIds = async () => {
    setIsParsing(true);
    try {
      // Get all not found patents
      const patentsToCheck = displayNotFoundPatents;
      
      if (patentsToCheck.length === 0) {
        toast.error('No patents to parse');
        return;
      }

      // Try to correct each patent ID
      const corrections: { [key: string]: string } = {};
      for (const patentId of patentsToCheck) {
        const corrected = await variationCorrectionForSearch(patentId);
        if (corrected && corrected !== patentId) {
          corrections[patentId] = corrected;
        }
      }

      // If we found any corrections, update the pending corrections
      if (Object.keys(corrections).length > 0) {
        setPendingCorrections(prev => ({ ...prev, ...corrections }));
        toast.success(`Found ${Object.keys(corrections).length} possible corrections`);
      } else {
        toast.error('No corrections found for the patent IDs');
      }
    } catch (error) {
      console.error('Error parsing patent IDs:', error);
      toast.error('Error parsing patent IDs');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmitCorrections = async () => {
    const correctedIds = Object.values(pendingCorrections).filter(id => id.trim() !== '');
    
    if (correctedIds.length === 0) {
      toast.error('No patent IDs to search');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the original IDs that were corrected
      const originalIds = Object.keys(pendingCorrections);
      
      // Remove corrected patents from notFoundPatents immediately
      const updatedNotFoundPatents = notFoundPatents.filter(id => !originalIds.includes(id));
      setNotFoundPatents(updatedNotFoundPatents);

      // Transform the corrected patent IDs
      const transformedResponse = await patentApi.transformPatentIds(correctedIds);
      
      if (!Array.isArray(transformedResponse)) {
        // If transform fails, add the patents back to notFoundPatents
        setNotFoundPatents([...notFoundPatents, ...originalIds]);
        toast.error('Failed to transform patent IDs');
        return;
      }

      // Search with transformed IDs
      const result = await onPatentSearch(transformedResponse);
      
      if (result.success && result.foundPatentIds && result.foundPatentIds.size > 0) {
        // Clear pending corrections
        setPendingCorrections({});
        toast.success(`${result.foundPatentIds.size} patent(s) found and added to results`);
      } else {
        // If search fails, add the patents back to notFoundPatents
        setNotFoundPatents([...notFoundPatents, ...originalIds]);
        toast.error('No patents found with the corrected IDs');
      }
    } catch (error) {
      console.error('Error submitting corrections:', error);
      toast.error('Error submitting corrections');
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="smart-search-modal-overlay">
      <div className="smart-search-modal">
        <div className="modal-header">
          <h3>
            <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px', color: '#c77dff' }} />
            Patent IDs
          </h3>
          <div className="patent-counts">
            <span className="found-count">Found: {filterByFamily ? familyFilteredPatents.length : filteredPatents.length}</span>
            <span className="not-found-count">Not Found: {notFoundPatents.length}</span>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="modal-main">
            <div className="modal-content">
              <div className="patents-section">
                <div className="patents-header">
                  <div className="patents-header-left">
                  <button 
                    className="toggle-button"
                    onClick={() => setShowNotFound(!showNotFound)}
                  >
                    <FontAwesomeIcon icon={faExchangeAlt} />
                    {showNotFound ? 'Show Found Patents' : 'Show Not Found Patents'}
                  </button>
                    {!showNotFound && (
                      <label className="family-filter-checkbox">
                        <input
                          type="checkbox"
                          checked={filterByFamily}
                          onChange={(e) => handleFilterByFamily(e.target.checked)}
                          disabled={isFilteringByFamily}
                        />
                        {isFilteringByFamily ? "Filtering by Family ID..." : "Filter by Family ID (using preferred authorities)"}
                      </label>
                    )}
                  </div>
                  {showNotFound && notFoundPatents.length > 0 && (
                    <button
                      className="parse-button"
                      onClick={handleParseIds}
                      disabled={isParsing}
                    >
                      <FontAwesomeIcon icon={faMagic} />
                      {isParsing ? 'Parsing...' : 'Parse IDs'}
                    </button>
                  )}
                </div>
                {!showNotFound && (
                  <div className="found-section-search">
                    <input
                      className="found-search-input"
                      type="text"
                      placeholder="Search found patents..."
                      value={foundSearch}
                      onChange={e => setFoundSearch(e.target.value)}
                    />
                  </div>
                )}
                {showNotFound && (
                  <div className="not-found-section-search">
                    <input
                      className="not-found-search-input"
                      type="text"
                      placeholder="Search not found patents..."
                      value={notFoundSearch}
                      onChange={e => setNotFoundSearch(e.target.value)}
                    />
                  </div>
                )}
                <div className="patents-grid">
                  {showNotFound ? (
                    (displayNotFoundPatents.filter(id => id.toLowerCase().includes(notFoundSearch.toLowerCase())).length === 0) ? (
                      <div className="no-results">
                        <p>No patents found matching the selected filter criteria.</p>
                      </div>
                    ) : (
                      displayNotFoundPatents
                        .filter(id => id.toLowerCase().includes(notFoundSearch.toLowerCase()))
                        .map(patentId => (
                          <div key={patentId} className="patent-card not-found">
                            {editingPatents[patentId] !== undefined ? (
                              <div className="edit-container">
                                <input
                                  type="text"
                                  className="edit-patent-input"
                                  value={editingPatents[patentId]}
                                  onChange={(e) => handleUpdatePatent(patentId, e.target.value)}
                                  placeholder="Enter corrected patent ID"
                                />
                                <button
                                  className="confirm-edit-button"
                                  onClick={() => handleConfirmEdit(patentId)}
                                >
                                  <FontAwesomeIcon icon={faCheckCircle} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="patent-id">
                                  {pendingCorrections[patentId] || patentId}
                                </div>
                                <div className="patent-actions">
                                  {!editingPatents[patentId] && (
                                    <button
                                      className="edit-button"
                                      onClick={() => handleEditPatent(patentId)}
                                    >
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))
                    )
                  ) : (
                    (filterByFamily ? familyFilteredPatents : filteredPatents)
                      .filter(id => id.toLowerCase().includes(foundSearch.toLowerCase()))
                      .map(patentId => (
                        <div key={patentId} className="patent-card found">
                          <div className="patent-id">{patentId}</div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {showNotFound && Object.keys(pendingCorrections).length > 0 && (
              <div className="modal-footer">
                <button
                  className="submit-corrections-button"
                  onClick={handleSubmitCorrections}
                  disabled={isSubmitting}
                >
                  <FontAwesomeIcon icon={faCheck} />
                  {isSubmitting ? 'Submitting...' : 'Submit Corrections'}
                </button>
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
            disabled={filteredPatents.length === 0}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartSearchModal; 