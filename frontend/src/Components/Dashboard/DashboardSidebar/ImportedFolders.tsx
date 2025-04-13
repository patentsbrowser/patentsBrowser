import React, { useState, useEffect } from 'react';
import './DashboardSidebar.scss';

interface CustomFolder {
  id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
}

interface ImportedFoldersProps {
  onPatentClick: (patentId: string) => void;
  onPatentWithFolderClick?: (patentId: string, folderName: string) => void;
  customPatentLists: CustomFolder[];
  isLoading: boolean;
  onModalStateChange?: (isOpen: boolean) => void;
}

// Modal component for patent selection
interface PatentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: CustomFolder | null;
  onSubmit: (selectedPatentIds: string[], folderName: string) => void;
}

const PatentSelectionModal: React.FC<PatentSelectionModalProps> = ({
  isOpen,
  onClose,
  folder,
  onSubmit
}) => {
  const [selectedPatentIds, setSelectedPatentIds] = useState<string[]>([]);
  
  // Reset selections when modal is opened with a new folder
  useEffect(() => {
    if (isOpen && folder) {
      setSelectedPatentIds([]);
    }
  }, [isOpen, folder]);
  
  if (!isOpen || !folder) return null;

  const handleTogglePatent = (patentId: string) => {
    setSelectedPatentIds(prev => 
      prev.includes(patentId)
        ? prev.filter(id => id !== patentId)
        : [...prev, patentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatentIds.length === folder.patentIds.length) {
      setSelectedPatentIds([]);
    } else {
      setSelectedPatentIds([...folder.patentIds]);
    }
  };

  const handleSubmit = () => {
    onSubmit(selectedPatentIds, folder.name);
    setSelectedPatentIds([]); // Reset selections
    onClose();
  };

  return (
    <div className="patent-selection-modal-overlay">
      <div className="patent-selection-modal select-patents-dialog">
        <div className="modal-header">
          <div className="header-with-select">
            <h3>{folder.name}</h3>
            <div className="select-all-container">
              <label className="select-all-label">
                <input 
                  type="checkbox" 
                  checked={selectedPatentIds.length === folder.patentIds.length && folder.patentIds.length > 0}
                  onChange={handleSelectAll}
                />
                Select All ({folder.patentIds.length})
              </label>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="patents-list">
            {folder.patentIds.map((patentId) => (
              <div key={patentId} className="patent-checkbox-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={selectedPatentIds.includes(patentId)}
                    onChange={() => handleTogglePatent(patentId)}
                  />
                  {patentId}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="dialog-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="submit-button" 
            onClick={handleSubmit}
            disabled={selectedPatentIds.length === 0}
          >
            Select Patents ({selectedPatentIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const ImportedFolders: React.FC<ImportedFoldersProps> = ({ 
  onPatentClick, 
  onPatentWithFolderClick, 
  customPatentLists, 
  isLoading,
  onModalStateChange 
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<CustomFolder | null>(null);
  
  // Notify parent component when modal state changes
  useEffect(() => {
    if (onModalStateChange) {
      onModalStateChange(modalOpen);
    }
  }, [modalOpen, onModalStateChange]);
  
  const openFolderModal = (folder: CustomFolder) => {
    setSelectedFolder(folder);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedFolder(null);
  };

  const handlePatentSelection = (selectedPatentIds: string[], folderName: string) => {
    if (selectedPatentIds.length > 0) {
      // Join the selected patent IDs with commas to ensure proper detection
      const patentIdsString = selectedPatentIds.join(',');
      
      // Use the onPatentWithFolderClick prop if available
      if (onPatentWithFolderClick) {
        onPatentWithFolderClick(patentIdsString, folderName);
      }
      // Fallback to window.patentSearchPopulateCallback
      else if (window.patentSearchPopulateCallback) {
        // Check if the extended function exists (with folder support)
        if (window.patentSearchPopulateWithFolderCallback) {
          window.patentSearchPopulateWithFolderCallback(patentIdsString, folderName);
        } else {
          window.patentSearchPopulateCallback(patentIdsString);
        }
      } else if (selectedPatentIds.length === 1) {
        // Use onPatentClick as fallback for a single patent ID
        onPatentClick(selectedPatentIds[0]);
      }
    }
  };
  
  return (
    <div className="imported-folders-section">
      <div className="folders-header">
        <h3 className="folders-title">Imported Lists</h3>
      </div>
      
      {isLoading ? (
        <div className="loading-message">Loading folders...</div>
      ) : customPatentLists.length === 0 ? (
        <div className="no-folders-message">
          No imported lists available.
        </div>
      ) : (
        <div className="imported-folders-list">
          {customPatentLists.map((folder) => (
            <div key={folder.id} className="imported-folder">
              <div 
                className="folder-header"
                onClick={() => openFolderModal(folder)}
              >
                <span className="folder-icon">📁</span>
                <span className="folder-name">{folder.name}</span>
                <span className="folder-count">
                  ({folder.patentIds.length})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <PatentSelectionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        folder={selectedFolder}
        onSubmit={handlePatentSelection}
      />
    </div>
  );
};

// Define the global interface for TypeScript
declare global {
  interface Window {
    patentSearchPopulateCallback?: (patentIds: string) => void;
    patentSearchPopulateWithFolderCallback?: (patentIds: string, folderName: string) => void;
  }
}

export default ImportedFolders;
