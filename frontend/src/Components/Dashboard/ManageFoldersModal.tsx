import React, { useState } from 'react';
import './ManageFoldersModal.scss';

interface PatentFolder {
  id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
}

interface ManageFoldersModalProps {
  folders: PatentFolder[];
  onClose: () => void;
  onDeleteFolders: (folderIds: string[]) => void;
  onRemovePatents: (folderId: string, patentIds: string[]) => void;
}

const ManageFoldersModal = ({ 
  folders, 
  onClose, 
  onDeleteFolders,
  onRemovePatents 
}: ManageFoldersModalProps) => {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [selectedPatents, setSelectedPatents] = useState<{[key: string]: string[]}>({});

  const handleSelectAllFolders = (checked: boolean) => {
    if (checked) {
      setSelectedFolders(folders.map(folder => folder.id));
    } else {
      setSelectedFolders([]);
    }
  };

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleSelectAllPatents = (folderId: string, checked: boolean) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setSelectedPatents(prev => ({
        ...prev,
        [folderId]: checked ? [...folder.patentIds] : []
      }));
    }
  };

  const handleSelectPatent = (folderId: string, patentId: string) => {
    setSelectedPatents(prev => {
      const folderPatents = prev[folderId] || [];
      return {
        ...prev,
        [folderId]: folderPatents.includes(patentId)
          ? folderPatents.filter(id => id !== patentId)
          : [...folderPatents, patentId]
      };
    });
  };

  const handleDeleteFolders = () => {
    if (selectedFolders.length > 0) {
      // Check if all folders are being deleted
      if (selectedFolders.length === folders.length) {
        // If all folders are selected, we're deleting everything
        onDeleteFolders(selectedFolders);
        onClose();
      } else {
        // If we're deleting specific folders, check if these are the last ones
        const remainingFolders = folders.filter(folder => !selectedFolders.includes(folder.id));
        if (remainingFolders.length === 0) {
          // If no folders would remain after deletion, close the modal
          onDeleteFolders(selectedFolders);
          onClose();
        } else {
          // Otherwise just delete and update state
          onDeleteFolders(selectedFolders);
          setSelectedFolders([]);
        }
      }
    }
  };

  const handleRemovePatents = (folderId: string) => {
    const patents = selectedPatents[folderId];
    if (patents?.length > 0) {
      onRemovePatents(folderId, patents);
      setSelectedPatents(prev => ({
        ...prev,
        [folderId]: []
      }));
      
      // Check if this folder will have no patents left
      const folder = folders.find(f => f.id === folderId);
      if (folder && patents.length === folder.patentIds.length) {
        // This folder will be empty after removing patents
        
        // Check if all other folders are already empty
        const otherFoldersEmpty = folders
          .filter(f => f.id !== folderId)
          .every(f => f.patentIds.length === 0);
          
        if (otherFoldersEmpty) {
          // If all folders will be empty, close the modal
          onClose();
        }
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Manage Patent Folders</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="select-all">
            <label>
              <input
                type="checkbox"
                checked={selectedFolders.length === folders.length}
                onChange={(e) => handleSelectAllFolders(e.target.checked)}
              />
              Select All Folders
            </label>
          </div>
          <div className="folders-list">
            {folders.map((folder) => (
              <div key={folder.id} className="folder-item">
                <div className="folder-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedFolders.includes(folder.id)}
                      onChange={() => handleSelectFolder(folder.id)}
                    />
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-count">({folder.patentIds.length})</span>
                  </label>
                  <button 
                    className="expand-button"
                    onClick={() => setExpandedFolder(
                      expandedFolder === folder.id ? null : folder.id
                    )}
                  >
                    {expandedFolder === folder.id ? '▼' : '▶'}
                  </button>
                </div>
                {expandedFolder === folder.id && (
                  <div className="folder-content">
                    <div className="select-all-patents">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedPatents[folder.id]?.length === folder.patentIds.length}
                          onChange={(e) => handleSelectAllPatents(folder.id, e.target.checked)}
                        />
                        Select All Patents
                      </label>
                      <button
                        className="remove-patents"
                        disabled={!selectedPatents[folder.id]?.length}
                        onClick={() => handleRemovePatents(folder.id)}
                      >
                        Remove Selected
                      </button>
                    </div>
                    <div className="patents-list">
                      {folder.patentIds.map((patentId) => (
                        <label key={patentId} className="patent-item">
                          <input
                            type="checkbox"
                            checked={selectedPatents[folder.id]?.includes(patentId)}
                            onChange={() => handleSelectPatent(folder.id, patentId)}
                          />
                          <span>{patentId}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="delete-button"
            onClick={handleDeleteFolders}
            disabled={selectedFolders.length === 0}
          >
            Delete Selected Folders
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageFoldersModal; 