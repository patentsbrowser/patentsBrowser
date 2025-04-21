import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import './savedPatentList.scss';
import { useAuth } from '../../AuthContext';
import Loader from '../Common/Loader';

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
  onSubmit: (folderName: string, workfileName: string, filterReadPatents: boolean) => void;
  existingFolders: CustomFolder[];
  patentIds: string[];
  readPatents: Set<string>;
}

const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingFolders,
  patentIds,
  readPatents
}) => {
  const [folderName, setFolderName] = useState('workfile');
  const [workfileName, setWorkfileName] = useState('workfile');
  const [selectedFolder, setSelectedFolder] = useState<CustomFolder | null>(null);
  const [filterReadPatents, setFilterReadPatents] = useState(true);
  const [filteredPatentIds, setFilteredPatentIds] = useState<string[]>(patentIds);

  useEffect(() => {
    if (isOpen) {
      setFolderName('workfile');
      setWorkfileName('workfile');
      setSelectedFolder(null);
      setFilterReadPatents(true);
      updateFilteredPatents(true);
    }
  }, [isOpen, patentIds, readPatents]);

  const updateFilteredPatents = (shouldFilter: boolean) => {
    if (shouldFilter) {
      setFilteredPatentIds(patentIds.filter(id => !readPatents.has(id.toUpperCase())));
    } else {
      setFilteredPatentIds(patentIds);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const shouldFilter = e.target.checked;
    setFilterReadPatents(shouldFilter);
    updateFilteredPatents(shouldFilter);
  };

  const handleSubmit = () => {
    if (selectedFolder) {
      const finalWorkfileName = workfileName.trim() || `workfile${(selectedFolder.workFiles?.length || 0) + 1}`;
      onSubmit(selectedFolder.name, finalWorkfileName, filterReadPatents);
    } else if (folderName.trim()) {
      onSubmit(folderName, workfileName, filterReadPatents);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="folder-selection-modal-overlay">
      <div className="folder-selection-modal">
        <div className="modal-header">
          <h3>Select Folder</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="patent-ids-summary">
            <p>Found {patentIds.length} patent IDs to save</p>
            {readPatents.size > 0 && (
              <p className="read-patents-info">
                ({patentIds.filter(id => readPatents.has(id.toUpperCase())).length} already read)
              </p>
            )}
          </div>

          <div className="filter-section">
            <label className="filter-label">
              <input
                type="checkbox"
                checked={filterReadPatents}
                onChange={handleFilterChange}
                className="filter-checkbox"
              />
              Filter out already read patents
            </label>
            {filterReadPatents && filteredPatentIds.length !== patentIds.length && (
              <p className="filter-info">
                Will save {filteredPatentIds.length} unread patents
              </p>
            )}
          </div>

          {existingFolders.length > 0 && (
            <div className="existing-folders-section">
              <label htmlFor="existing-folders">Add to Existing Folder:</label>
              <select
                id="existing-folders"
                value={selectedFolder?._id || ''}
                onChange={(e) => {
                  const folder = existingFolders.find(f => f._id === e.target.value);
                  setSelectedFolder(folder || null);
                  setFolderName('');
                }}
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
            disabled={!selectedFolder && !folderName.trim()}
          >
            {selectedFolder ? 'Add to Folder' : 'Create Workfile'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Remove the localStorage keys and functions
const getUserStorageKey = (userId: string) => `savedPatentList_${userId}`;

const SavedPatentList = () => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [patentIds, setPatentIds] = useState<string[]>(() => {
    if (user?.id) {
      const stored = localStorage.getItem(getUserStorageKey(user.id));
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [readPatents, setReadPatents] = useState<Set<string>>(new Set());

  // Fetch existing folders
  const { data: existingFolders = [], isLoading: isLoadingFolders } = useQuery<CustomFolder[]>({
    queryKey: ['importedLists'],
    queryFn: async () => {
      const response = await authApi.getImportedLists();
      return response.data || [];
    },
  });

  const savePatentMutation = useMutation({
    mutationFn: (payload: { ids: string[], folderName?: string }) => 
      authApi.savePatent(payload.ids, payload.folderName),
    onSuccess: (response) => {
      toast.success(response.message || 'Patents saved successfully!');
      setInputValue('');
      setPatentIds([]);
      setShowFolderModal(false);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to save patents. Please try again.';
      toast.error(errorMessage);
      console.error('Error saving patents:', error);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addPatentId();
    }
  };

  const addPatentId = () => {
    if (!inputValue.trim()) return;
    
    const newIds = inputValue
      .split(',')
      .map(id => id.trim())
      .filter(id => id && !patentIds.includes(id));
    
    setPatentIds([...patentIds, ...newIds]);
    setInputValue('');
  };

  const removePatentId = (idToRemove: string) => {
    setPatentIds(patentIds.filter(id => id !== idToRemove));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'txt' && fileExtension !== 'doc' && fileExtension !== 'docx' && 
        fileExtension !== 'xls' && fileExtension !== 'xlsx' && fileExtension !== 'csv') {
      toast.error('Please upload a .txt, .doc, .docx, .xls, .xlsx, or .csv file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);

    try {
      const response = await authApi.uploadPatentFile(file);
      
      if (response.data && Array.isArray(response.data.patentIds)) {
        const extractedIds: string[] = response.data.patentIds;
        
        // Remove read patents filtering
        const newIds = extractedIds.filter(id => {
          const standardizedId = id.trim().toUpperCase();
          return !patentIds.includes(standardizedId);
        });
        
        if (newIds.length > 0) {
          setPatentIds(prevIds => [...prevIds, ...newIds]);
          setShowFolderModal(true);
          toast.success(`Added ${newIds.length} new patents`);
        } else {
          toast.success('All patents from this file have already been added');
        }
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error(error.response?.data?.message || 'Failed to process file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim()) {
      addPatentId();
    }
    
    if (patentIds.length > 0 || inputValue.trim()) {
      setShowFolderModal(true);
    }
  };

  const handleFolderSelection = async (folderName: string, workfileName: string, filterReadPatents: boolean) => {
    const idsToSave = patentIds.length > 0 ? patentIds : [inputValue.trim()];
    
    // Remove read status check
    const combinedFolderName = `${folderName}/${workfileName}`;
    savePatentMutation.mutate(
      { ids: idsToSave, folderName: combinedFolderName },
      {
        onSuccess: () => {
          localStorage.removeItem(getUserStorageKey(user?.id || ''));
          setPatentIds([]);
          setInputValue('');
          toast.success(`Saved ${idsToSave.length} patents to ${folderName}`);
        }
      }
    );
  };

  // Function to clear all unsaved patents
  const clearUnsavedPatents = () => {
    if (user?.id) {
      localStorage.removeItem(getUserStorageKey(user.id));
    }
    setPatentIds([]);
    setInputValue('');
    toast.success('Cleared all unsaved patents');
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="saved-patent-list">
      {(savePatentMutation.isPending || isUploading) && (
        <Loader 
          fullScreen={true} 
          text={isUploading ? "Processing file..." : "Saving patents..."} 
        />
      )}
      <h2>Save Patents</h2>
      {!user?.id && (
        <div className="login-notice">
          <p>Please log in to save your patent list across devices</p>
        </div>
      )}
      {user?.id && patentIds.length > 0 && (
        <div className="unsaved-patents-notice">
          <p>You have {patentIds.length} unsaved patents from your previous session</p>
          <button 
            onClick={clearUnsavedPatents}
            className="clear-button"
          >
            Clear All
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="save-patent-form">
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Enter Patent ID (e.g., US-8125463-B2) and press Enter or comma to add multiple"
            className="patent-input"
          />
          <button 
            type="button" 
            onClick={addPatentId}
            className="add-button"
          >
            Add
          </button>
        </div>
        
        <div className="file-upload-container">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.doc,.docx,.xls,.xlsx,.csv"
            className="file-input"
            style={{ display: 'none' }}
          />
          <button 
            type="button" 
            onClick={triggerFileInput}
            className="file-upload-button"
            disabled={isUploading}
          >
            Upload File (.txt, .doc, .docx, .xls, .xlsx, .csv)
          </button>
          <div className="file-upload-info">
            <p>The system will extract patent IDs from the uploaded file</p>
            <p>For spreadsheet files (Excel/CSV): Looks for columns with "Earliest publication number" and "Publication kind codes" headers</p>
            <p>When multiple kind codes are found (like "A1, A, T5"), the system will prioritize A1, B1, B2, A, B in that order and combine without spaces (e.g., US8125463A1)</p>
          </div>
        </div>
        
        {patentIds.length > 0 && (
          <div className="patent-ids-list">
            <p>Patents to save: <span className="count">({patentIds.length})</span></p>
            <ul>
              {patentIds.map((id, index) => (
                <li key={index}>
                  {id}
                  <button 
                    type="button" 
                    onClick={() => removePatentId(id)}
                    className="remove-button"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={savePatentMutation.isPending || (!inputValue.trim() && patentIds.length === 0)}
          className="submit-button"
        >
          Save Patents
        </button>
      </form>

      <FolderSelectionModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSubmit={handleFolderSelection}
        existingFolders={existingFolders}
        patentIds={patentIds}
        readPatents={readPatents}
      />
    </div>
  );
};

export default SavedPatentList; 