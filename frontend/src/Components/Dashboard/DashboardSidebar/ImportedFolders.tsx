import React, { useState, useEffect } from 'react';
import './DashboardSidebar.scss';

interface WorkFile {
  name: string;
  patentIds: string[];
  timestamp: number;
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

  useEffect(() => {
    console.log('Custom Patent Lists:', customPatentLists);
    if (customPatentLists?.length > 0) {
      console.log('First folder:', customPatentLists[0]);
      console.log('First folder workFiles:', customPatentLists[0].workFiles);
    }
  }, [customPatentLists]);

  const handleFolderClick = (folderId: string) => {
    setExpandedFolder(expandedFolder === folderId ? null : folderId);
    // Clear expanded workfiles when collapsing a folder
    if (expandedFolder === folderId) {
      setExpandedWorkFiles(new Set());
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
          {customPatentLists.map((folder) => (
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
                  {folder.workFiles.map((workfile, index) => {
                    const workfileId = `${folder._id}-${index}`;
                    const isWorkFileExpanded = expandedWorkFiles.has(workfileId);
                    
                    return (
                      <div key={workfileId} className="workfile-item">
                        <div 
                          className="workfile-header"
                          onClick={() => handleWorkFileClick(workfileId)}
                        >
                          <div className="workfile-info">
                            <span className="workfile-icon">
                              {isWorkFileExpanded ? '📂' : '📁'}
                            </span>
                            <span className="workfile-name">
                              {workfile.name || `Workfile ${index + 1}`}
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
          ))}
        </div>
      )}
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
