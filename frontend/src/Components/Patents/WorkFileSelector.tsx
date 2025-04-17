import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authApi } from '../../api/auth';
import Loader from '../Common/Loader';
import './WorkFileSelector.scss';

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

interface WorkFileSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string, workFileName: string) => void;
}

const WorkFileSelector: React.FC<WorkFileSelectorProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedWorkFile, setSelectedWorkFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getImportedLists();
      setFolders(response.data || []);
      
      // Auto-select first folder and its first workfile if available
      if (response.data?.length > 0) {
        const firstFolder = response.data[0];
        setSelectedFolder(firstFolder._id);
        if (firstFolder.workFiles?.length > 0) {
          setSelectedWorkFile(firstFolder.workFiles[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const folderId = e.target.value;
    setSelectedFolder(folderId);
    // Reset workfile selection when folder changes
    setSelectedWorkFile(null);
  };

  const handleWorkFileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWorkFile(e.target.value);
  };

  const handleSubmit = () => {
    if (selectedFolder && selectedWorkFile) {
      onSelect(selectedFolder, selectedWorkFile);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="workfile-selector-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add to Workfile</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {isLoading ? (
            <Loader text="Loading folders..." fullScreen={false} />
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="folder-select">Select Folder:</label>
                <select
                  id="folder-select"
                  value={selectedFolder || ''}
                  onChange={handleFolderChange}
                >
                  <option value="">Select a folder</option>
                  {folders.map(folder => (
                    <option key={folder._id} value={folder._id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFolder && (
                <div className="form-group">
                  <label htmlFor="workfile-select">Select Workfile:</label>
                  <select
                    id="workfile-select"
                    value={selectedWorkFile || ''}
                    onChange={handleWorkFileChange}
                  >
                    <option value="">Select a workfile</option>
                    {folders
                      .find(f => f._id === selectedFolder)
                      ?.workFiles.map(workfile => (
                        <option key={workfile.name} value={workfile.name}>
                          {workfile.name} ({workfile.patentIds.length} patents)
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={!selectedFolder || !selectedWorkFile}
          >
            Add to Workfile
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WorkFileSelector; 