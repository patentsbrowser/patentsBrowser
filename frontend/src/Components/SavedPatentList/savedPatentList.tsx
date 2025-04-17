import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import './savedPatentList.scss';
import { useAuth } from '../../AuthContext';

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
  onSubmit: (folderName: string, workfileName: string) => void;
  existingFolders: CustomFolder[];
  patentIds: string[];
}

const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingFolders,
  patentIds
}) => {
  const [folderName, setFolderName] = useState('workfile');
  const [workfileName, setWorkfileName] = useState('workfile');
  const [selectedFolder, setSelectedFolder] = useState<CustomFolder | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFolderName('workfile');
      setWorkfileName('workfile');
      setSelectedFolder(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (selectedFolder) {
      // Find the next workfile number for the selected folder
      const workfileCount = selectedFolder.workFiles?.length || 0;
      const nextWorkfileName = `workfile${workfileCount + 1}`;
      onSubmit(selectedFolder.name, nextWorkfileName);
    } else if (folderName.trim()) {
      onSubmit(folderName, workfileName);
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
              disabled={!!selectedFolder}
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

// Update storage keys to be user-specific
const getUserStorageKey = (userId: string) => `savedPatentList_${userId}`;
const getUserReadPatentsKey = (userId: string) => `readPatents_${userId}`;

// Function to get read patents from localStorage with user ID
const getReadPatents = (userId: string): Set<string> => {
  const stored = localStorage.getItem(getUserReadPatentsKey(userId));
  return stored ? new Set(JSON.parse(stored)) : new Set();
};

// Function to add a patent to read list with user ID
const addToReadPatents = (userId: string, patentId: string) => {
  const readPatents = getReadPatents(userId);
  readPatents.add(patentId);
  localStorage.setItem(getUserReadPatentsKey(userId), JSON.stringify([...readPatents]));
};

const SavedPatentList = () => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [patentIds, setPatentIds] = useState<string[]>(() => {
    // Initialize from localStorage only if user exists
    if (user?.id) {
      const stored = localStorage.getItem(getUserStorageKey(user.id));
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [readPatents, setReadPatents] = useState<Set<string>>(user?.id ? getReadPatents(user.id) : new Set());

  // Update state when user changes (e.g., after login)
  useEffect(() => {
    if (user?.id) {
      const storedPatents = localStorage.getItem(getUserStorageKey(user.id));
      setPatentIds(storedPatents ? JSON.parse(storedPatents) : []);
      setReadPatents(getReadPatents(user.id));
    } else {
      // Clear state if no user
      setPatentIds([]);
      setReadPatents(new Set());
    }
  }, [user?.id]);

  // Save patentIds to localStorage whenever it changes
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getUserStorageKey(user.id), JSON.stringify(patentIds));
    }
  }, [patentIds, user?.id]);

  // Listen for patent view events
  useEffect(() => {
    const handlePatentView = (event: CustomEvent) => {
      if (user?.id) {
        const viewedPatentId = event.detail.patentId;
        addToReadPatents(user.id, viewedPatentId);
        setReadPatents(getReadPatents(user.id));
      }
    };

    window.addEventListener('patent-viewed' as any, handlePatentView);
    return () => {
      window.removeEventListener('patent-viewed' as any, handlePatentView);
    };
  }, [user?.id]);

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
        
        // Filter out already read patents and duplicates
        const newIds = extractedIds.filter(id => {
          const standardizedId = id.trim().toUpperCase();
          return !readPatents.has(standardizedId) && !patentIds.includes(standardizedId);
        });
        
        if (newIds.length > 0) {
          setPatentIds(prevIds => [...prevIds, ...newIds]);
          setShowFolderModal(true);
          
          if (extractedIds.length !== newIds.length) {
            const skippedCount = extractedIds.length - newIds.length;
            toast.success(`Added ${newIds.length} new patents. Skipped ${skippedCount} previously read patents.`);
          } else {
            toast.success(`Added ${newIds.length} new patents`);
          }
        } else {
          toast.success('All patents from this file have already been read or added');
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

  const handleFolderSelection = (folderName: string, workfileName: string) => {
    const idsToSave = patentIds.length > 0 ? patentIds : [inputValue.trim()];
    const combinedFolderName = `${folderName}/${workfileName}`;
    
    savePatentMutation.mutate(
      { ids: idsToSave, folderName: combinedFolderName },
      {
        onSuccess: () => {
          // Clear the saved state after successful save
          localStorage.removeItem(getUserStorageKey(user?.id || ''));
          setPatentIds([]);
          setInputValue('');
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
            {isUploading ? 'Processing...' : 'Upload File (.txt, .doc, .docx, .xls, .xlsx, .csv)'}
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
                <li key={index} className={readPatents.has(id.toUpperCase()) ? 'read' : ''}>
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
          {savePatentMutation.isPending ? 'Saving...' : 'Save Patents'}
        </button>
      </form>

      <FolderSelectionModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSubmit={handleFolderSelection}
        existingFolders={existingFolders}
        patentIds={patentIds}
      />
    </div>
  );
};

export default SavedPatentList; 