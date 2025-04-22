import React, { useState, useEffect } from 'react';
import './FolderSelectionModal.scss';
import { toast } from 'react-hot-toast';
import { patentApi } from '../../api/patents';

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
  notFoundPatents = []
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
  const [editedPatents, setEditedPatents] = useState<{ [key: string]: string }>({});
  const [editingPatents, setEditingPatents] = useState<Set<string>>(new Set());
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
      setEditedPatents({});
      setEditingPatents(new Set());
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
        const existingFamilyPatents = new Set<string>();
        selectedFolder.workFiles?.forEach(workFile => {
          workFile.patentIds.forEach(id => {
            existingFamilyPatents.add(id.toUpperCase());
            const familyIds = familyPatents[id.toUpperCase()] || [];
            familyIds.forEach(familyId => existingFamilyPatents.add(familyId.toUpperCase()));
          });
        });

        filtered = filtered.filter(id => {
          const upperId = id.toUpperCase();
          if (existingFamilyPatents.has(upperId)) return false;
          const familyIds = familyPatents[upperId] || [];
          return !familyIds.some(familyId => existingFamilyPatents.has(familyId.toUpperCase()));
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

  const toggleEdit = (id: string) => {
    setEditingPatents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handlePatentEdit = (originalId: string, newId: string) => {
    setEditedPatents(prev => ({
      ...prev,
      [originalId]: newId
    }));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      toggleEdit(id);
    } else if (e.key === 'Escape') {
      // Reset to original value and disable editing
      setEditedPatents(prev => {
        const newEdited = { ...prev };
        delete newEdited[id];
        return newEdited;
      });
      toggleEdit(id);
    }
  };

  const handleSubmitCorrections = async () => {
    setIsSubmittingCorrections(true);
    try {
      // Get all edited patent IDs that have been changed
      const correctedPatents = Object.entries(editedPatents)
        .filter(([originalId, newId]) => originalId !== newId && newId.trim() !== '')
        .map(([_, newId]) => newId.trim());

      if (correctedPatents.length === 0) {
        return;
      }

      // Call the search API with corrected patents
      const response = await patentApi.searchPatentsForValidation(correctedPatents);
      
      if (response.results && Array.isArray(response.results)) {
        // Update the found and not found lists
        const newFoundPatents = response.results.map((result: PatentSearchResult) => result.patent_id);
        const stillNotFound = correctedPatents.filter(id => !newFoundPatents.includes(id));
        
        // Update the filtered patents list with newly found patents
        setFilteredPatentIds(prev => [...prev, ...newFoundPatents]);
        
        // Clear the edited status for successfully found patents
        const updatedEditedPatents = { ...editedPatents };
        newFoundPatents.forEach((foundId: string) => {
          const originalId = Object.keys(editedPatents).find(key => editedPatents[key] === foundId);
          if (originalId) {
            delete updatedEditedPatents[originalId];
          }
        });
        setEditedPatents(updatedEditedPatents);
        
        // Show success message
        if (newFoundPatents.length > 0) {
          toast.success(`Found ${newFoundPatents.length} corrected patents`);
        }
        if (stillNotFound.length > 0) {
          toast.error(`${stillNotFound.length} patents still not found`);
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
    // No need to filter not-found patents here anymore since filteredPatentIds already excludes them
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

            {notFoundPatents.length > 0 && showNotFound && (
              <div className="not-found-section">
                <div className="not-found-header">
                  <h4>Patents Not Found in Database</h4>
                  {Object.keys(editedPatents).length > 0 && (
                    <button
                      className="submit-corrections-button"
                      onClick={handleSubmitCorrections}
                      disabled={isSubmittingCorrections}
                    >
                      {isSubmittingCorrections ? 'Submitting...' : 'Submit Corrections'}
                    </button>
                  )}
                </div>
                <div className="not-found-list">
                  {notFoundPatents.map((id, index) => (
                    <div key={index} className="not-found-item">
                      <div className="patent-id-edit">
                        <input
                          type="text"
                          value={editedPatents[id] || id}
                          onChange={(e) => handlePatentEdit(id, e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, id)}
                          className="patent-id-input"
                          placeholder="Enter correct patent ID"
                          readOnly={!editingPatents.has(id)}
                        />
                        <button 
                          className={`edit-button ${editingPatents.has(id) ? 'editing' : ''}`}
                          onClick={() => {
                            if (editingPatents.has(id) && editedPatents[id] === id) {
                              // If we're in edit mode but no changes, just exit edit mode
                              toggleEdit(id);
                            } else if (editingPatents.has(id)) {
                              // If we're in edit mode and there are changes, save changes
                              toggleEdit(id);
                            } else {
                              // Enter edit mode
                              toggleEdit(id);
                            }
                          }}
                          title={editingPatents.has(id) ? 'Save' : 'Edit'}
                        >
                          {editingPatents.has(id) ? '✓' : editedPatents[id] && editedPatents[id] !== id ? '↺' : '✎'}
                        </button>
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