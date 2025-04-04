import React, { useState } from 'react';
import './DashboardSidebar.scss';

interface PatentFolder {
  id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
}

interface PatentFoldersProps {
  patentFolders: PatentFolder[];
  onManageFolders: () => void;
  onPatentClick: (patentId: string) => void;
  onPatentWithFolderClick?: (patentId: string, folderName: string) => void;
}

const PatentFolders: React.FC<PatentFoldersProps> = ({
  patentFolders,
  onManageFolders,
  onPatentClick,
  onPatentWithFolderClick,
}) => {
  const [expandedPatentFolderId, setExpandedPatentFolderId] = useState<string | null>(null);

  const togglePatentFolder = (folderId: string) => {
    setExpandedPatentFolderId(expandedPatentFolderId === folderId ? null : folderId);
  };

  const handlePatentClick = (patentId: string, folderName: string) => {
    if (onPatentWithFolderClick) {
      onPatentWithFolderClick(patentId, folderName);
    } else {
      onPatentClick(patentId);
    }
    setExpandedPatentFolderId(null);
  };

  return (
    <div className="patent-folders-section">
      <div className="folders-header">
        <h3 className="folders-title">Patent Folders</h3>
        {patentFolders.length > 0 && (
          <button className="manage-folders" onClick={onManageFolders}>
            Manage Folders
          </button>
        )}
      </div>
      <div className="patent-folders">
        {patentFolders.map((folder) => (
          <div key={folder.id} className="patent-folder">
            <div
              className="folder-header"
              onClick={() => togglePatentFolder(folder.id)}
            >
              <span className="folder-icon">
                {expandedPatentFolderId === folder.id ? "📂" : "📁"}
              </span>
              <span className="folder-name">{folder.name}</span>
              <span className="folder-count">
                ({folder.patentIds.length})
              </span>
            </div>
            {expandedPatentFolderId === folder.id && (
              <div className="folder-content">
                {folder?.patentIds?.map((patentId) => (
                  <div
                    key={patentId}
                    className="folder-patent-item"
                    onClick={() => handlePatentClick(patentId, folder.name)}
                  >
                    {patentId}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {patentFolders.length === 0 && (
          <div className="no-folders-message">
            No patent folders available.
          </div>
        )}
      </div>
    </div>
  );
};

export default PatentFolders; 