import React, { useState, useEffect } from 'react';
import './FolderSelectionModal.scss';

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

  useEffect(() => {
    if (isOpen) {
      setFolderName('workfile');
      setWorkfileName('workfile');
      setSelectedFolder(null);
      setFilterDuplicates(true);
      setFilterFamily(true);
      setAllDuplicates(false);
      setShowNotFound(true);
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
      let filtered = [...patentIds];
      
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

  const handleSubmit = () => {
    // Get only the found patent IDs by excluding not found patents
    const foundPatentIds = filteredPatentIds.filter(id => !notFoundPatents.includes(id));
    
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
                <h4>Patents Not Found in Database</h4>
                <div className="not-found-list">
                  {notFoundPatents.map((id, index) => (
                    <div key={index} className="not-found-item">
                      {id}
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