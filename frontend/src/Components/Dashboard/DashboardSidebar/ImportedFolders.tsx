import React, { useState, useEffect } from 'react';
import './DashboardSidebar.scss';
import CombineWorkfilesModal from './CombineWorkfilesModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons';
// import { authApi } from '../../../../api/auth';
import toast from 'react-hot-toast';
import { authApi } from '../../../api/auth';

interface WorkFile {
  _id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
  isCombined?: boolean;
}

interface CustomFolder {
  _id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
  workFiles: WorkFile[];
  createdAt: string;
  source: string;
  userId: string;
  __v: number;
}

interface ImportedFoldersProps {
  onPatentClick: (patentId: string) => void;
  onPatentWithFolderClick?: (patentId: string, folderName: string) => void;
  customPatentLists: CustomFolder[];
  isLoading: boolean;
  onModalStateChange?: (isOpen: boolean) => void;
}

const ImportedFolders: React.FC<ImportedFoldersProps> = ({ 
  onPatentClick, 
  onPatentWithFolderClick, 
  customPatentLists, 
  isLoading,
  onModalStateChange 
}) => {
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [expandedWorkFiles, setExpandedWorkFiles] = useState<Set<string>>(new Set());
  const [selectedWorkFiles, setSelectedWorkFiles] = useState<Map<string, Set<number>>>(new Map());
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedFolderForCombine, setSelectedFolderForCombine] = useState<CustomFolder | null>(null);

  // Add new state variables for menu functionality
  const [showMenu, setShowMenu] = useState<{
    type: 'folder' | 'workfile' | 'patent' | null;
    id: string;
    parentId?: string;
    name?: string;
    position?: { x: number; y: number };
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'folder' | 'workfile' | 'patent';
    id: string;
    parentId?: string;
    name?: string;
  } | null>(null);

  const handleFolderClick = (folderId: string) => {
    setExpandedFolder(expandedFolder === folderId ? null : folderId);
    if (expandedFolder === folderId) {
      setExpandedWorkFiles(new Set());
      setSelectedWorkFiles(new Map());
    }
  };

  const handleWorkFileClick = (workfileId: string) => {
    setExpandedWorkFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workfileId)) {
        newSet.delete(workfileId);
      } else {
        newSet.add(workfileId);
      }
      return newSet;
    });
  };

  const handleWorkFileSelect = (e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>, folderId: string, workFileIndex: number) => {
    e.stopPropagation();
    setSelectedWorkFiles(prev => {
      const newMap = new Map(prev);
      const selectedForFolder = new Set<number>(newMap.get(folderId) || new Set());
      
      if (selectedForFolder.has(workFileIndex)) {
        selectedForFolder.delete(workFileIndex);
      } else {
        selectedForFolder.add(workFileIndex);
      }
      
      if (selectedForFolder.size === 0) {
        newMap.delete(folderId);
      } else {
        newMap.set(folderId, selectedForFolder);
      }
      
      return newMap;
    });
  };

  const handleCombineWorkFiles = (folder: CustomFolder, selectedIndices: Set<number>) => {
    // Get selected workfiles
    const selectedWorkFiles = Array.from(selectedIndices).map(index => folder.workFiles[index]);
    
    // Process patent IDs to find duplicates
    const allPatentIds = selectedWorkFiles.flatMap(workFile => workFile.patentIds);
    const uniqueIds = new Set<string>();
    const duplicates = new Set<string>();

    allPatentIds.forEach(id => {
      if (uniqueIds.has(id)) {
        duplicates.add(id);
      } else {
        uniqueIds.add(id);
      }
    });

    setSelectedFolderForCombine(folder);
    setShowCombineModal(true);
    if (onModalStateChange) {
      onModalStateChange(true);
    }
  };

  const handleModalClose = () => {
    setShowCombineModal(false);
    setSelectedFolderForCombine(null);
    if (onModalStateChange) {
      onModalStateChange(false);
    }
  };

  const handleCombineConfirm = async (uniquePatentIds: string[], duplicateIds: string[], invalidIds: string[]) => {
    if (!selectedFolderForCombine) return;

    // Get all selected workfiles
    const selectedIndices = selectedWorkFiles.get(selectedFolderForCombine._id) || new Set();
    const selectedWorkFilesList = Array.from(selectedIndices).map(index => selectedFolderForCombine.workFiles[index]);

    // Create new workfile name based on existing workfiles count
    const newWorkFileName = `Workfile ${selectedFolderForCombine.workFiles.length + 1}`;

    const newWorkFile: WorkFile = {
      _id: new Date().getTime().toString(), // Generate a temporary ID
      name: newWorkFileName,
      patentIds: uniquePatentIds,
      timestamp: Date.now(),
      isCombined: true
    };

    // Here you would typically make an API call to save the new workfile
    // For now, we'll just update the local state
    const updatedLists = customPatentLists.map(f => {
      if (f._id === selectedFolderForCombine._id) {
        return {
          ...f,
          workFiles: [...f.workFiles, newWorkFile]
        };
      }
      return f;
    });

    // You would typically have a prop to update the parent state
    // onUpdateCustomPatentLists(updatedLists);
    
    // Clear selections and close modal
    setSelectedWorkFiles(new Map());
    handleModalClose();
  };

  const handlePatentClick = (patentId: string, folderName: string) => {
    if (onPatentWithFolderClick) {
      onPatentWithFolderClick(patentId, folderName);
    } else if (window.patentSearchPopulateCallback) {
      if (window.patentSearchPopulateWithFolderCallback) {
        window.patentSearchPopulateWithFolderCallback(patentId, folderName);
      } else {
        window.patentSearchPopulateCallback(patentId);
      }
    } else {
      onPatentClick(patentId);
    }
  };

  // Update handleDelete function to handle workfile deletion correctly
  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      switch (itemToDelete.type) {
        case 'folder':
          await authApi.deleteItem({
            itemType: 'folder',
            folderId: itemToDelete.id
          });
          toast.success('Folder deleted successfully');
          break;
        case 'workfile':
          // Delete specific workfile using workFileId
          await authApi.deleteItem({
            itemType: 'workfile',
            folderId: itemToDelete.parentId!,
            workFileId: itemToDelete.id  // Use workFileId instead of workFileName
          });
          toast.success(`Workfile "${itemToDelete.name}" deleted successfully`);
          break;
        case 'patent':
          await authApi.deleteItem({
            itemType: 'patent',
            folderId: itemToDelete.parentId!,
            patentId: itemToDelete.id
          });
          toast.success('Patent removed successfully');
          break;
      }

      // Dispatch event to refresh the folder list
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  // Add workfile delete button handler
  const handleWorkfileDelete = (e: React.MouseEvent, folderId: string, workFile: WorkFile) => {
    e.stopPropagation();
    setItemToDelete({
      type: 'workfile',
      id: workFile._id,
      parentId: folderId,
      name: workFile.name
    });
    setShowDeleteModal(true);
  };

  // Add search handlers
  const handleSearch = (type: 'folder' | 'workfile' | 'patent', id: string, parentId?: string, name?: string) => {
    switch (type) {
      case 'folder':
        // Search all patents in the folder
        const folder = customPatentLists.find(f => f._id === id);
        if (folder) {
          const event = new CustomEvent('search-patents', {
            detail: {
              patentIds: folder.patentIds,
              source: `folder/${folder.name}`
            }
          });
          window.dispatchEvent(event);
        }
        break;
      case 'workfile':
        // Search patents in the workfile
        const parentFolder = customPatentLists.find(f => f._id === parentId);
        if (parentFolder) {
          const workfile = parentFolder.workFiles.find(w => w.name === name);
          if (workfile) {
            const event = new CustomEvent('search-patents', {
              detail: {
                patentIds: workfile.patentIds,
                source: `workfile/${name}`
              }
            });
            window.dispatchEvent(event);
          }
        }
        break;
      case 'patent':
        // Search single patent
        const event = new CustomEvent('search-patents', {
          detail: {
            patentIds: [id],
            source: 'patent'
          }
        });
        window.dispatchEvent(event);
        break;
    }
  };

  return (
    <div className="imported-folders-section">
      <div className="folders-header">
        <h3 className="folders-title">Imported Lists</h3>
      </div>
      
      {isLoading ? (
        <div className="loading-message">Loading folders...</div>
      ) : !customPatentLists || customPatentLists.length === 0 ? (
        <div className="no-folders-message">
          No imported lists available.
        </div>
      ) : (
        <div className="imported-folders-list">
          {customPatentLists.map((folder) => {
            const selectedWorkFileIndices = selectedWorkFiles.get(folder._id) || new Set();
            const canCompare = selectedWorkFileIndices.size >= 2;
            
            return (
              <div 
                key={folder._id} 
                className={`imported-folder ${expandedFolder === folder._id ? 'expanded' : ''}`}
              >
                <div 
                  className="folder-header"
                  onClick={() => handleFolderClick(folder._id)}
                >
                  <div className="folder-info">
                    <span className="folder-icon">📁</span>
                    <span className="folder-name">{folder.name}</span>
                    <div className="folder-actions">
                      <button 
                        className="action-button delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete({
                            type: 'folder',
                            id: folder._id,
                            name: folder.name
                          });
                          setShowDeleteModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  <span className="expand-icon">
                    {expandedFolder === folder._id ? '▼' : '▶'}
                  </span>
                </div>
                
                {expandedFolder === folder._id && folder.workFiles && folder.workFiles.length > 0 && (
                  <div className="folder-content">
                    <div className="workfiles-header">
                      <div className="selection-info">
                        {selectedWorkFileIndices.size > 0 && (
                          <span>{selectedWorkFileIndices.size} workfiles selected</span>
                        )}
                      </div>
                      {canCompare && (
                        <button 
                          className="combine-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCombineWorkFiles(folder, selectedWorkFileIndices);
                          }}
                        >
                          Combine Selected
                        </button>
                      )}
                    </div>
                    {folder.workFiles.map((workfile, index) => {
                      const workfileId = `${folder._id}-${index}`;
                      const isWorkFileExpanded = expandedWorkFiles.has(workfileId);
                      const isSelected = selectedWorkFileIndices.has(index);
                      
                      return (
                        <div 
                          key={workfileId} 
                          className={`workfile-item ${isSelected ? 'selected' : ''} ${workfile.isCombined ? 'combined' : ''}`}
                        >
                          <div className="workfile-header">
                            <div className="workfile-select">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleWorkFileSelect(e, folder._id, index)}
                              />
                            </div>
                            <div 
                              className="workfile-info"
                              onClick={() => handleWorkFileClick(workfileId)}
                            >
                              <span className="workfile-icon">
                                {isWorkFileExpanded ? '📂' : '📁'}
                              </span>
                              <span className="workfile-name">
                                {workfile.name}
                              </span>
                              <div className="workfile-actions">
                                <button 
                                  className="action-button search-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSearch('workfile', workfile.name, folder._id, workfile.name);
                                  }}
                                >
                                  <FontAwesomeIcon icon={faSearch} />
                                </button>
                                <button 
                                  className="action-button delete-button"
                                  onClick={(e) => handleWorkfileDelete(e, folder._id, workfile)}
                                >
                                  <FontAwesomeIcon icon={faTrash} />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {isWorkFileExpanded && workfile.patentIds && (
                            <div className="patents-list">
                              {workfile.patentIds.map((patentId, idx) => (
                                <div 
                                  key={idx} 
                                  className="patent-item"
                                  onClick={() => handlePatentClick(patentId, folder.name)}
                                >
                                  <span className="patent-id">{patentId}</span>
                                  <div className="patent-actions">
                                    <button 
                                      className="action-button delete-button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setItemToDelete({
                                          type: 'patent',
                                          id: patentId,
                                          parentId: folder._id
                                        });
                                        setShowDeleteModal(true);
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Menu Popup */}
      {showMenu && (
        <div 
          className="menu-popup"
          style={{
            position: 'absolute',
            left: showMenu.position?.x + 'px',
            top: showMenu.position?.y + 'px'
          }}
        >
          <div className="menu-options">
            <button 
              className="menu-option"
              onClick={() => {
                handleSearch(showMenu.type!, showMenu.id, showMenu.parentId, showMenu.name);
                setShowMenu(null);
              }}
            >
              <FontAwesomeIcon icon={faSearch} /> Search
            </button>
            <button 
              className="menu-option delete"
              onClick={() => {
                setItemToDelete({
                  type: showMenu.type!,
                  id: showMenu.id,
                  parentId: showMenu.parentId,
                  name: showMenu.name
                });
                setShowDeleteModal(true);
                setShowMenu(null);
              }}
            >
              <FontAwesomeIcon icon={faTrash} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="delete-modal">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this {itemToDelete.type}?</p>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showCombineModal && selectedFolderForCombine && (
        <CombineWorkfilesModal
          isOpen={showCombineModal}
          onClose={handleModalClose}
          selectedWorkFiles={(() => {
            const indices = selectedWorkFiles.get(selectedFolderForCombine._id);
            if (!indices) return [];
            return Array.from(indices).map(index => selectedFolderForCombine.workFiles[index]);
          })()}
          onCombine={handleCombineConfirm}
        />
      )}
    </div>
  );
};

declare global {
  interface Window {
    patentSearchPopulateCallback?: (patentIds: string) => void;
    patentSearchPopulateWithFolderCallback?: (patentIds: string, folderName: string) => void;
  }
}

export default ImportedFolders;
