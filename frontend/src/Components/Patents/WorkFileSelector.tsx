import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authApi } from '../../api/auth';
import Loader from '../Common/Loader';
import { toast } from 'react-toastify';
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
  selectedPatentIds?: string[];
}

const WorkFileSelector: React.FC<WorkFileSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedPatentIds = []
}) => {
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedWorkFile, setSelectedWorkFile] = useState<string | null>(null);
  const [newWorkFileName, setNewWorkFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  useEffect(() => {
    // Log the selectedPatentIds whenever they change
    console.log('WorkFileSelector received selectedPatentIds:', selectedPatentIds);
  }, [selectedPatentIds]);

  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getImportedLists();
      setFolders(response.data || []);
      
      // Auto-select first folder if available
      if (response.data?.length > 0) {
        const firstFolder = response.data[0];
        setSelectedFolder(firstFolder._id);
        setSelectedWorkFile(null);
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
    setSelectedWorkFile(null);
    setNewWorkFileName('');
  };

  const handleWorkFileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWorkFile(e.target.value);
    setNewWorkFileName('');
  };

  const handleSubmit = async () => {
    if (selectedFolder && (selectedWorkFile || newWorkFileName)) {
      try {
        const workFileName = selectedWorkFile || newWorkFileName;
        
        // Make sure we have a valid array of patent IDs
        let patentsToAdd = Array.isArray(selectedPatentIds) ? [...selectedPatentIds] : [];
        
        // Make sure the array is not empty
        if (patentsToAdd.length === 0) {
          toast.error('No patents selected for adding to workfile');
          return;
        }

        // If creating new workfile and removeDuplicates is checked, remove common patent IDs
        if (!selectedWorkFile && removeDuplicates) {
          const currentFolder = folders.find(f => f._id === selectedFolder);
          if (currentFolder) {
            const existingPatentIds = new Set(
              currentFolder.workFiles.flatMap(wf => wf.patentIds)
            );
            patentsToAdd = patentsToAdd.filter(id => !existingPatentIds.has(id));
          }
        }

        console.log('Sending API request with:', { 
          folderId: selectedFolder, 
          workFileName, 
          patentIds: patentsToAdd 
        });

        // Call the onSelect callback instead of directly making the API call
        // This allows the parent component to handle the API call with the correct patentIds
        onSelect(selectedFolder, workFileName);
        onClose();
      } catch (error: any) {
        console.error('Error adding patents to workfile:', error);
        // Check if error response has status code 400
        if (error.response?.data?.statusCode === 400) {
          toast.info(error.response.data.message);
          onClose();
          return;
        }
        // Show other error messages
        const errorMessage = error.response?.data?.message || error.message || 'Failed to add patents to workfile';
        toast.error(errorMessage);
      }
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
                <>
                  <div className="form-group">
                    <label htmlFor="workfile-select">Select Workfile:</label>
                    <select
                      id="workfile-select"
                      value={selectedWorkFile || ''}
                      onChange={handleWorkFileChange}
                    >
                      <option value="">Create new workfile</option>
                      {folders
                        .find(f => f._id === selectedFolder)
                        ?.workFiles.map(workfile => (
                          <option key={workfile.name} value={workfile.name}>
                            {workfile.name} ({workfile.patentIds.length} patents)
                          </option>
                        ))}
                    </select>
                  </div>

                  {!selectedWorkFile && (
                    <>
                      <div className="form-group">
                        <label htmlFor="new-workfile-name">New Workfile Name:</label>
                        <input
                          id="new-workfile-name"
                          type="text"
                          value={newWorkFileName}
                          onChange={(e) => setNewWorkFileName(e.target.value)}
                          placeholder="Enter new workfile name"
                          className="workfile-name-input"
                        />
                      </div>
                      <div className="form-group checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={removeDuplicates}
                            onChange={(e) => setRemoveDuplicates(e.target.checked)}
                          />
                          Remove patents that already exist in other workfiles
                        </label>
                      </div>
                    </>
                  )}
                </>
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
            disabled={!selectedFolder || (!selectedWorkFile && !newWorkFileName.trim())}
          >
            {selectedWorkFile ? 'Add to Workfile' : 'Create New Workfile'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WorkFileSelector; 