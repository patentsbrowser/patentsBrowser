import React, { useState, useEffect } from 'react';
import './FolderSelectionModal.scss';
import { toast } from 'react-hot-toast';
import { patentApi } from '../../api/patents';
import { variationCorrection } from '../../utils/patentUtils';

interface WorkFile {
  name: string;
  patentIds: string[];
  timestamp: number;
}

interface CustomFolder {
  _id: string;
  id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
  workFiles?: WorkFile[];
}

interface FolderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (folderName: string, workfileName: string, filterDuplicates: boolean, filterFamily: boolean, foundPatentIds: string[]) => void;
  existingFolders: CustomFolder[];
  patentIds: string[];
  familyPatents?: { [key: string]: string[] };
  notFoundPatents?: string[];
  setNotFoundPatents: (patents: string[]) => void;
}

interface PatentSearchResult {
  patent_id: string;
  family_id: string;
}

interface PatentSearchResponse {
  results: PatentSearchResult[];
  not_found: string[];
}

const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingFolders,
  patentIds,
  familyPatents = {},
  notFoundPatents = [],
  setNotFoundPatents
}) => {
  const [folderName, setFolderName] = useState('workfile');
  const [workfileName, setWorkfileName] = useState('workfile');
  const [selectedFolder, setSelectedFolder] = useState<CustomFolder | null>(null);
  const [filterDuplicates, setFilterDuplicates] = useState(true);
  const [filterFamily, setFilterFamily] = useState(true);
  const [filteredPatentIds, setFilteredPatentIds] = useState<string[]>(patentIds);
  const [isFiltering, setIsFiltering] = useState(false);
  const [allDuplicates, setAllDuplicates] = useState(false);
  const [showNotFound, setShowNotFound] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedValues, setEditedValues] = useState<{ [key: string]: string }>({});
  const [isSubmittingCorrections, setIsSubmittingCorrections] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFolderName('workfile');
      setWorkfileName('workfile');
      setSelectedFolder(null);
      setFilterDuplicates(true);
      setFilterFamily(true);
      setAllDuplicates(false);
      setShowNotFound(true);
      setEditedValues({});
      setEditingIndex(null);
      updateFilteredPatents(true, true);
    }
  }, [isOpen, patentIds]);

  useEffect(() => {
    if (selectedFolder) {
      updateFilteredPatents(filterDuplicates, filterFamily);
    }
  }, [selectedFolder, filterDuplicates, filterFamily]);

  const updateFilteredPatents = async (shouldFilterDuplicates: boolean, shouldFilterFamily: boolean) => {
    setIsFiltering(true);
    try {
      // First filter out not-found patents
      let filtered = patentIds.filter(id => !notFoundPatents.includes(id));
      
      if (shouldFilterDuplicates && selectedFolder) {
        const existingPatents = new Set<string>();
        selectedFolder.workFiles?.forEach(workFile => {
          workFile.patentIds.forEach(id => existingPatents.add(id.toUpperCase()));
        });
        
        filtered = filtered.filter(id => !existingPatents.has(id.toUpperCase()));
      }

      if (shouldFilterFamily && selectedFolder) {
        // First, collect all family IDs from existing patents in the folder
        const existingFamilyIds = new Set<string>();
        selectedFolder.workFiles?.forEach(workFile => {
          workFile.patentIds.forEach(id => {
            const upperPatentId = id.toUpperCase();
            // Add the family ID of this patent if it exists
            const familyId = familyPatents[upperPatentId]?.[0];
            if (familyId) {
              existingFamilyIds.add(familyId.toUpperCase());
            }
          });
        });

        // Get user's preferred patent authorities
        const preferredAuthorities = (localStorage.getItem('preferredPatentAuthority') || 'US WO EP GB FR DE CH JP RU SU')
          .split(' ')
          .map(auth => auth.toUpperCase());

        // Create a map of family IDs for the current patent list
        const currentFamilyIds = new Map<string, string>();
        filtered.forEach(id => {
          const upperPatentId = id.toUpperCase();
          const familyId = familyPatents[upperPatentId]?.[0];
          if (familyId) {
            currentFamilyIds.set(upperPatentId, familyId.toUpperCase());
          }
        });

        // Group patents by family ID
        const familyGroups = new Map<string, string[]>();
        currentFamilyIds.forEach((familyId, patentId) => {
          if (!familyGroups.has(familyId)) {
            familyGroups.set(familyId, []);
          }
          familyGroups.get(familyId)?.push(patentId);
        });

        // Filter out patents based on family relationships
        filtered = filtered.filter(id => {
          const upperPatentId = id.toUpperCase();
          const familyId = currentFamilyIds.get(upperPatentId);

          // If no family ID, keep the patent
          if (!familyId) return true;

          // If family already exists in folder, filter out
          if (existingFamilyIds.has(familyId)) return false;

          // For new family groups, keep only the preferred patent based on authority order
          const familyGroup = familyGroups.get(familyId);
          if (familyGroup) {
            // Sort patents by preferred authority
            const sortedPatents = [...familyGroup].sort((a, b) => {
              const aCountry = a.slice(0, 2);
              const bCountry = b.slice(0, 2);
              const aIndex = preferredAuthorities.indexOf(aCountry);
              const bIndex = preferredAuthorities.indexOf(bCountry);
              
              // If both countries are in preferences, use their order
              if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
              }
              // If only one country is in preferences, prefer it
              if (aIndex !== -1) return -1;
              if (bIndex !== -1) return 1;
              // If neither country is in preferences, keep original order
              return 0;
            });

            // Keep only the most preferred patent from the family
            return upperPatentId === sortedPatents[0];
          }

          return true;
        });
      }
      
      setFilteredPatentIds(filtered);
      setAllDuplicates(filtered.length === 0);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleDuplicateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const shouldFilter = e.target.checked;
    setFilterDuplicates(shouldFilter);
    updateFilteredPatents(shouldFilter, filterFamily);
  };

  const handleFamilyFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const shouldFilter = e.target.checked;
    setFilterFamily(shouldFilter);
    updateFilteredPatents(filterDuplicates, shouldFilter);
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const folder = existingFolders.find(f => f._id === e.target.value);
    setSelectedFolder(folder || null);
    setFolderName('');
    if (folder) {
      await updateFilteredPatents(filterDuplicates, filterFamily);
    } else {
      setAllDuplicates(false);
      setFilteredPatentIds(patentIds);
    }
  };

  const toggleEdit = (index: number) => {
    setEditingIndex(editingIndex === index ? null : index);
  };

  const handlePatentEdit = (originalId: string, newId: string) => {
    setEditedValues(prev => ({
      ...prev,
      [originalId]: newId
    }));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditedValues(prev => {
        const newValues = { ...prev };
        delete newValues[notFoundPatents[index]];
        return newValues;
      });
    }
  };

  const handleParsePatents = async () => {
    const updatedPatents: { [key: string]: string } = {};
    
    notFoundPatents.forEach(patentId => {
      const correctedId = variationCorrection(patentId);
      if (correctedId !== patentId) {
        updatedPatents[patentId] = correctedId;
      }
    });

    // Update the edited values state
    setEditedValues(prev => ({
      ...prev,
      ...updatedPatents
    }));

    // Show success message
    if (Object.keys(updatedPatents).length > 0) {
      toast.success(`Corrected ${Object.keys(updatedPatents).length} patent IDs`);
    } else {
      toast('No patent IDs needed correction');
    }
  };

  const handleSubmitCorrections = async () => {
    setIsSubmittingCorrections(true);
    try {
      // Get all edited patent IDs that have been parsed/changed
      const correctedPatents = Object.values(editedValues).filter(id => id.trim() !== '');

      if (correctedPatents.length === 0) {
        toast.error('No changes to submit');
        return;
      }

      // Call the search API with corrected patents
      const response = await patentApi.searchPatentsForValidation(correctedPatents) as PatentSearchResponse;
      
      if (response.results && Array.isArray(response.results)) {
        // Update the found and not found lists
        const newFoundPatents = response.results.map((result: PatentSearchResult) => result.patent_id);
        const stillNotFound = correctedPatents.filter(id => !newFoundPatents.includes(id));

        // Update the filtered patents list with newly found patents
        setFilteredPatentIds(prev => [...prev, ...newFoundPatents]);

        // Remove all successfully parsed patents from notFoundPatents list
        const updatedNotFoundPatents = notFoundPatents.filter(id => {
          const correctedId = editedValues[id];
          // Keep only patents that weren't parsed or were parsed but still not found
          return !correctedId || stillNotFound.includes(correctedId);
        });
        setNotFoundPatents(updatedNotFoundPatents);
        
        // Clear the edited status for all parsed patents that were found
        const updatedEditedValues = { ...editedValues };
        Object.keys(editedValues).forEach(originalId => {
          const correctedId = editedValues[originalId];
          if (newFoundPatents.includes(correctedId)) {
            delete updatedEditedValues[originalId];
          }
        });
        setEditedValues(updatedEditedValues);
        setEditingIndex(null);
        
        // Show success message with updated counts
        if (newFoundPatents.length > 0) {
          toast.success(`Successfully found and saved ${newFoundPatents.length} patents`);
        }
        if (stillNotFound.length > 0) {
          toast.error(`${stillNotFound.length} patents could not be found in the database`);
        }
      }
    } catch (error) {
      console.error('Error submitting corrections:', error);
      toast.error('Failed to validate corrected patents');
    } finally {
      setIsSubmittingCorrections(false);
    }
  };

  const handleSubmit = () => {
    // Use filteredPatentIds which already contains the correct list of found patents
    const foundPatentIds = filteredPatentIds;
    
    if (selectedFolder) {
      const finalWorkfileName = workfileName.trim() || `workfile${(selectedFolder.workFiles?.length || 0) + 1}`;
      onSubmit(selectedFolder.name, finalWorkfileName, filterDuplicates, filterFamily, foundPatentIds);
    } else if (folderName.trim()) {
      onSubmit(folderName.trim(), workfileName.trim() || 'workfile', false, filterFamily, foundPatentIds);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="folder-selection-modal-overlay">
      <div className="folder-selection-modal">
        <div className="modal-header">
          <h3>Select Folder</h3>
          <div className="header-actions">
            {notFoundPatents.length > 0 && (
              <button
                type="button"
                className="toggle-not-found"
                onClick={() => setShowNotFound(!showNotFound)}
              >
                {showNotFound ? 'Hide' : 'Show'} Not Found ({notFoundPatents.length})
              </button>
            )}
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="modal-content-wrapper">
            <div className="main-content">
              <div className="patent-ids-summary">
                <p className="total-patents">Total Patents: {patentIds.length}</p>
                <div className="patent-status">
                  <p className="found-patents">
                    ✓ Found: {patentIds.length - notFoundPatents.length} patents
                  </p>
                  {notFoundPatents.length > 0 && (
                    <p className="not-found-count">
                      ⚠️ Not Found: {notFoundPatents.length} patents
                    </p>
                  )}
                </div>
              </div>

              {existingFolders.length > 0 && (
                <div className="existing-folders-section">
                  <label htmlFor="existing-folders">Add to Existing Folder:</label>
                  <select
                    id="existing-folders"
                    value={selectedFolder?._id || ''}
                    onChange={handleFolderSelect}
                    className="folder-select"
                  >
                    <option value="">Select a folder...</option>
                    {existingFolders.map((folder) => (
                      <option key={folder._id} value={folder._id}>
                        {folder.name} ({folder.patentIds.length})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {selectedFolder && (
                <div className="filter-section">
                  <div className="filter-option">
                    <label className="filter-label">
                      <input
                        type="checkbox"
                        checked={filterDuplicates}
                        onChange={handleDuplicateFilterChange}
                        className="filter-checkbox"
                        disabled={isFiltering}
                      />
                      Filter out patents that already exist in this folder
                    </label>
                  </div>
                  <div className="filter-option">
                    <label className="filter-label">
                      <input
                        type="checkbox"
                        checked={filterFamily}
                        onChange={handleFamilyFilterChange}
                        className="filter-checkbox"
                        disabled={isFiltering}
                      />
                      Filter out patents from the same family
                    </label>
                  </div>
                  {isFiltering ? (
                    <p className="filter-info">Checking for duplicates and family patents...</p>
                  ) : allDuplicates ? (
                    <p className="filter-info error">All patents are already in this folder or from the same family</p>
                  ) : (filterDuplicates || filterFamily) ? (
                    <p className="filter-info">
                      Will save {filteredPatentIds.length} new patents
                    </p>
                  ) : null}
                </div>
              )}
              
              <div className="new-folder-section">
                <label htmlFor="folder-name">Or Create New Folder:</label>
                <input
                  id="folder-name"
                  type="text"
                  value={folderName}
                  onChange={(e) => {
                    setFolderName(e.target.value);
                    setSelectedFolder(null);
                  }}
                  placeholder="Enter new folder name"
                  disabled={!!selectedFolder}
                  className="compact-input"
                />
              </div>

              <div className="workfile-section">
                <label htmlFor="workfile-name">Workfile Name:</label>
                <input
                  id="workfile-name"
                  type="text"
                  value={workfileName}
                  onChange={(e) => setWorkfileName(e.target.value)}
                  placeholder="Enter workfile name"
                  className="compact-input"
                />
              </div>
            </div>

            {notFoundPatents.length > 0 && showNotFound ? (
              <div className="not-found-section">
                <div className="not-found-header">
                  <h4>Patents Not Found in Database</h4>
                  <div className="header-actions">
                    <button
                      className="parse-button"
                      onClick={handleParsePatents}
                      type="button"
                    >
                      Parse IDs
                    </button>
                    {Object.keys(editedValues).length > 0 && (
                      <button
                        className="submit-corrections-button"
                        onClick={handleSubmitCorrections}
                        disabled={isSubmittingCorrections}
                      >
                        {isSubmittingCorrections ? 'Submitting...' : 'Submit Corrections'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="not-found-list">
                  {notFoundPatents.map((patentId, index) => (
                    <div key={index} className="not-found-item">
                      <div className="patent-id-edit">
                        <input
                          type="text"
                          value={editedValues[patentId] || patentId}
                          readOnly={editingIndex !== index}
                          className="patent-id-input"
                          onChange={(e) => handlePatentEdit(patentId, e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, index)}
                        />
                        <button
                          className={`edit-button ${editingIndex === index ? 'editing' : ''}`}
                          onClick={() => toggleEdit(index)}
                        >
                          {editingIndex === index ? (
                            <i className="fas fa-check" />
                          ) : (
                            <i className="fas fa-edit" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="not-found-section">
                <div className="not-found-header">
                  <h4>Found Patents in Database</h4>
                </div>
                <div className="not-found-list">
                  {patentIds.filter(id => !notFoundPatents.includes(id)).map((id, index) => (
                    <div key={index} className="not-found-item">
                      <div className="patent-id-edit">
                        <input
                          type="text"
                          value={id}
                          readOnly
                          className="patent-id-input"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="submit-button" 
            onClick={handleSubmit}
            disabled={(!selectedFolder && !folderName.trim()) || (!!selectedFolder && allDuplicates)}
          >
            {selectedFolder ? 'Add to Folder' : 'Create Workfile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderSelectionModal; 