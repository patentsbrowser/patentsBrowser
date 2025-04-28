import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../Redux/hooks';
import { RootState } from '../../Redux/store';
import { setFilters, setSmartSearchResults, clearSmartSearchResults, initializeSmartSearchResults } from '../../Redux/slices/patentSlice';
import './SmartSearchModal.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimesCircle, faEdit, faCheck, faExchangeAlt, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

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
  selectedTypes,
  setSelectedTypes,
  filterByFamily,
  setFilterByFamily,
  notFoundPatents,
  onPatentSearch,
  setNotFoundPatents,
  setIsLoading
}) => {
  const [filteredPatents, setFilteredPatents] = useState<string[]>([]);
  const [editingPatents, setEditingPatents] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctedPatents, setCorrectedPatents] = useState<{ [key: string]: string }>({});
  const [showNotFound, setShowNotFound] = useState(false);
  const [pendingCorrections, setPendingCorrections] = useState<{ [key: string]: string }>({});
  
  const dispatch = useAppDispatch();
  const { smartSearchResults } = useAppSelector((state: RootState) => state.patents);

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

  // Clear smart search results when modal closes
  useEffect(() => {
    if (!isOpen) {
      dispatch(clearSmartSearchResults());
    }
  }, [isOpen, dispatch]);

  // Save filtered patent IDs to Redux whenever they change
  useEffect(() => {
    dispatch(setFilters({ filteredPatentIds: filteredPatents }));
  }, [filteredPatents, dispatch]);

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

  const handleSubmitCorrections = async () => {
    const correctedIds = Object.values(pendingCorrections).filter(id => id.trim() !== '');
    
    if (correctedIds.length === 0) {
      toast.error('No patent IDs to search');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onPatentSearch(correctedIds);
      
      if (result.success && result.foundPatentIds && result.foundPatentIds.size > 0) {
        // Add found patents to filteredPatents, avoiding duplicates
        const newFoundPatents = Array.from(result.foundPatentIds).filter(id => !filteredPatents.includes(id));
        setFilteredPatents(prev => [...prev, ...newFoundPatents]);
        
        // Remove found patents from notFoundPatents
        const updatedNotFoundPatents = notFoundPatents.filter(id => {
          const correctedId = pendingCorrections[id];
          return !(correctedId && result.foundPatentIds?.has(correctedId));
        });
        
        setNotFoundPatents(updatedNotFoundPatents);
        setPendingCorrections({});
        toast.success(`${result.foundPatentIds.size} patent(s) found and added to results`);
      } else {
        toast.error('No patents found with the corrected IDs');
      }
    } catch (error) {
      toast.error('Failed to search patents');
      console.error('Error searching patents:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show all not found patents in the UI, regardless of pending corrections
  const displayNotFoundPatents = notFoundPatents;

  return (
    <div className="smart-search-modal-overlay">
      <div className="smart-search-modal">
        <div className="modal-header">
          <h3>
            <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px', color: '#c77dff' }} />
            Patent IDs
          </h3>
          <div className="patent-counts">
            <span className="found-count">Found: {filteredPatents.length}</span>
            <span className="not-found-count">Not Found: {displayNotFoundPatents.length}</span>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="modal-main">
            <div className="modal-content">
              <div className="patents-section">
                <div className="patents-header">
                  <button 
                    className="toggle-button"
                    onClick={() => setShowNotFound(!showNotFound)}
                  >
                    <FontAwesomeIcon icon={faExchangeAlt} />
                    {showNotFound ? 'Show Found Patents' : 'Show Not Found Patents'}
                  </button>
                </div>
                
                <div className="patents-grid">
                  {showNotFound ? (
                    displayNotFoundPatents.length === 0 ? (
                      <div className="no-results">
                        <p>No patents found matching the selected filter criteria.</p>
                      </div>
                    ) : (
                      displayNotFoundPatents.map((patentId) => (
                        <div key={patentId} className="patent-card not-found">
                          {editingPatents[patentId] ? (
                            <div className="edit-container">
                              <input
                                type="text"
                                className="edit-patent-input"
                                value={editingPatents[patentId]}
                                onChange={(e) => handleUpdatePatent(patentId, e.target.value)}
                                placeholder="Enter corrected patent ID"
                                autoFocus
                              />
                              <button
                                className="confirm-edit-button"
                                onClick={() => handleConfirmEdit(patentId)}
                                title="Confirm edit"
                              >
                                <FontAwesomeIcon icon={faCheckCircle} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="patent-id">{patentId}</div>
                              <button
                                className="edit-button"
                                onClick={() => handleEditPatent(patentId)}
                                title="Edit patent ID"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                            </>
                          )}
                        </div>
                      ))
                    )
                  ) : (
                    filteredPatents.length === 0 ? (
                      <div className="no-results">
                        <p>No patents found matching the selected filter criteria.</p>
                      </div>
                    ) : (
                      filteredPatents.map((patentId) => (
                        <div key={patentId} className="patent-card found">
                          <div className="patent-id">{patentId}</div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>

            {Object.keys(pendingCorrections).length > 0 && (
              <div className="not-found-actions">
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