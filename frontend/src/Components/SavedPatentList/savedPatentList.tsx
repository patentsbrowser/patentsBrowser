import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { patentApi } from '../../api/patents';
import toast from 'react-hot-toast';
import './savedPatentList.scss';
import { useAuth } from '../../AuthContext';
import Loader from '../Common/Loader';
import FolderSelectionModal from '../FolderSelectionModal/FolderSelectionModal';

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

interface PatentSearchResult {
  family_id: string;
  patent_id: string;
}

interface PatentSearchResponse {
  results: PatentSearchResult[];
  not_found: string[];
}

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
  const [transformedPatentIds, setTransformedPatentIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [familyPatents, setFamilyPatents] = useState<{ [key: string]: string[] }>({});
  const [notFoundPatents, setNotFoundPatents] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Add patent search mutation
  const searchPatentsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await patentApi.searchPatentsForValidation(ids);
    },
    onSuccess: (data: PatentSearchResponse) => {
      // Process found patents and their family IDs
      const familyMap: { [key: string]: string[] } = {};
      const foundPatents = new Set<string>();
      
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach(result => {
          if (result.family_id) {
            familyMap[result.patent_id] = [result.family_id];
            foundPatents.add(result.patent_id);
          }
        });
      }

      // Find not found patents
      const notFound = data.not_found || [];
      
      setFamilyPatents(familyMap);
      setNotFoundPatents(notFound);
      setIsSearching(false);
    },
    onError: (error) => {
      console.error('Error searching patents:', error);
      toast.error('Failed to validate patents');
      setIsSearching(false);
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
        // Use the patent IDs directly as they come from the file
        const extractedIds = response.data.patentIds;
        
        if (extractedIds.length > 0) {
          // Transform patent IDs using Unified Patents API
          const transformedResponse = await patentApi.transformPatentIds(extractedIds);
          
          // Check if we have a valid array of transformed IDs
          if (Array.isArray(transformedResponse)) {
            // Set both original and transformed IDs
            setPatentIds(extractedIds);
            setTransformedPatentIds(transformedResponse);
            
            // Search patents in Unified Patents API using transformed IDs
            setIsSearching(true);
            await searchPatentsMutation.mutateAsync(transformedResponse);
            
            setShowFolderModal(true);
            toast.success(`Added ${transformedResponse.length} new patents`);
          } else {
            toast.error('Failed to transform patent IDs');
          }
        } else {
          toast.error('No patent IDs found in file');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim()) {
      addPatentId();
    }
    
    if (patentIds.length > 0) {
      setIsSearching(true);
      try {
        // Transform patent IDs using Unified Patents API
        const transformedResponse = await patentApi.transformPatentIds(patentIds);
        
        // Check if we have a valid array of transformed IDs
        if (Array.isArray(transformedResponse)) {
          // Set transformed IDs
          setTransformedPatentIds(transformedResponse);
          
          // Search patents in Unified Patents API using transformed IDs
          await searchPatentsMutation.mutateAsync(transformedResponse);
          setShowFolderModal(true);
        } else {
          toast.error('Failed to transform patent IDs');
        }
      } catch (error) {
        console.error('Error validating patents:', error);
        toast.error('Failed to validate patents. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleFolderSelection = async (folderName: string, workfileName: string, filterDuplicates: boolean, filterFamily: boolean, foundPatentIds: string[]) => {
    const combinedFolderName = `${folderName}/${workfileName}`;
    savePatentMutation.mutate(
      { ids: foundPatentIds, folderName: combinedFolderName },
      {
        onSuccess: () => {
          localStorage.removeItem(getUserStorageKey(user?.id || ''));
          setPatentIds([]);
          setTransformedPatentIds([]);
          setInputValue('');
          toast.success(`Saved ${foundPatentIds.length} patents to ${folderName}`);
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
    setTransformedPatentIds([]);
    setInputValue('');
    toast.success('Cleared all unsaved patents');
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="saved-patent-list-page">
      <div className="saved-patent-list">
        {(savePatentMutation.isPending || isUploading || isSearching) && (
          <Loader 
            fullScreen={true} 
            text={isUploading ? "Processing file..." : isSearching ? "Validating patents..." : "Saving patents..."} 
          />
        )}
        <h2 className="saved-patents-title">Upload File to Save Patents</h2>
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
          
          {/* {patentIds.length > 0 && (
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
          )} */}
          
          <button 
            type="submit" 
            disabled={savePatentMutation.isPending || (!inputValue.trim() && patentIds.length === 0)}
            className="submit-button"
          >
            Proceed
          </button>
        </form>

        <FolderSelectionModal
          isOpen={showFolderModal}
          onClose={() => setShowFolderModal(false)}
          onSubmit={handleFolderSelection}
          existingFolders={existingFolders}
          patentIds={transformedPatentIds}
          familyPatents={familyPatents}
          notFoundPatents={notFoundPatents}
          setNotFoundPatents={setNotFoundPatents}
        />
      </div>
    </div>
  );
};

export default SavedPatentList; 