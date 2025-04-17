import React, { useState, useEffect } from 'react';
import './DashboardSidebar.scss';

interface WorkFile {
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
    
    // Get all unique patent IDs
    const uniquePatentIds = Array.from(
      new Set(
        selectedWorkFiles.flatMap(workFile => workFile.patentIds)
      )
    );

    // Create new workfile name based on existing workfiles count
    const newWorkFileName = `Workfile ${folder.workFiles.length + 1}`;

    const newWorkFile: WorkFile = {
      name: newWorkFileName,
      patentIds: uniquePatentIds,
      timestamp: Date.now(),
      isCombined: true
    };

    // Here you would typically make an API call to save the new workfile
    // For now, we'll just update the local state
    const updatedLists = customPatentLists.map(f => {
      if (f._id === folder._id) {
        return {
          ...f,
          workFiles: [...f.workFiles, newWorkFile]
        };
      }
      return f;
    });

    // You would typically have a prop to update the parent state
    // onUpdateCustomPatentLists(updatedLists);
    
    // Clear selections
    setSelectedWorkFiles(new Map());
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
                  </div>
                  <div className="folder-meta">
                    <span className="folder-count">
                      {folder.workFiles?.length || 0} workfiles
                    </span>
                    <span className="expand-icon">
                      {expandedFolder === folder._id ? '▼' : '▶'}
                    </span>
                  </div>
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
                          onClick={() => handleCombineWorkFiles(folder, selectedWorkFileIndices)}
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
                            </div>
                            <span className="workfile-count">
                              {workfile.patentIds?.length || 0} patents
                            </span>
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
