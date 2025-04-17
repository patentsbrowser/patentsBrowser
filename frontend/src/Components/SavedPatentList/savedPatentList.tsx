import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import './savedPatentList.scss';

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

const SavedPatentList = () => {
  const [inputValue, setInputValue] = useState('');
  const [patentIds, setPatentIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        // For Excel/CSV files, check if we have publication numbers and kind codes
        if (fileExtension === 'xls' || fileExtension === 'xlsx' || fileExtension === 'csv') {
          console.log('Publication numbers from spreadsheet:', response.data.publicationNumbers);
          console.log('Kind codes from spreadsheet:', response.data.kindCodes);
          
          const pubNumbersCount = response.data.publicationNumbers?.length || 0;
          const kindCodesCount = response.data.kindCodes?.length || 0;
          
          if (extractedIds.length === 0 && pubNumbersCount > 0) {
            toast.success(`No patent IDs were found, but ${pubNumbersCount} publication numbers were found. These have been added as potential patent IDs.`);
          } else {
            let message = `${extractedIds.length} patent IDs extracted from file.`;
            
            if (pubNumbersCount > 0 && kindCodesCount > 0) {
              message += ` Combined ${pubNumbersCount} publication numbers with ${kindCodesCount} kind codes.`;
            } else if (pubNumbersCount > 0) {
              message += ` Found ${pubNumbersCount} publication numbers.`;
            }
            
            toast.success(message);
            
            if (response.data.note) {
              setTimeout(() => {
                toast.success(response.data.note);
              }, 500);
            }
          }
        } else {
          toast.success(`${extractedIds.length} patent IDs extracted from file`);
        }
        
        // Filter out duplicates
        const newIds = extractedIds.filter(id => !patentIds.includes(id));
        
        if (newIds.length > 0) {
          setPatentIds([...patentIds, ...newIds]);
          setShowFolderModal(true);
        } else {
          toast.success('No new patent IDs found in the file');
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
    // Combine folder name and workfile name with a slash to create a subfolder
    const combinedFolderName = `${folderName}/${workfileName}`;
    savePatentMutation.mutate({ ids: idsToSave, folderName: combinedFolderName });
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="saved-patent-list">
      <h2>Save Patents</h2>
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