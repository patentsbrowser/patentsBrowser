import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import './savedPatentList.scss';

const SavedPatentList = () => {
  const [inputValue, setInputValue] = useState('');
  const [patentIds, setPatentIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [folderName, setFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savePatentMutation = useMutation({
    mutationFn: (payload: { ids: string[], folderName?: string }) => 
      authApi.savePatent(payload.ids, payload.folderName),
    onSuccess: (response) => {
      // Display success message from API response
      toast.success(response.message || 'Patents saved successfully!');
      setInputValue('');
      setPatentIds([]);
      setFolderName('');
    },
    onError: (error: any) => {
      // Display error message from API response if available
      const errorMessage = error.response?.data?.message || 'Failed to save patents. Please try again.';
      toast.error(errorMessage);
      console.error('Error saving patents:', error);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If user presses Enter or comma, add the patent ID
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addPatentId();
    }
  };

  const addPatentId = () => {
    if (!inputValue.trim()) return;
    
    // Process input - could be a single ID or multiple IDs separated by commas
    const newIds = inputValue
      .split(',')
      .map(id => id.trim())
      .filter(id => id && !patentIds.includes(id));
    
    if (newIds.length > 0) {
      setPatentIds([...patentIds, ...newIds]);
      setInputValue('');
    }
  };

  const removePatentId = (idToRemove: string) => {
    setPatentIds(patentIds.filter(id => id !== idToRemove));
  };

  const handleFolderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFolderName(e.target.value);
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
      // Upload the file to the server for processing
      const response = await authApi.uploadPatentFile(file, folderName);
      
      if (response.data && Array.isArray(response.data.patentIds)) {
        const extractedIds: string[] = response.data.patentIds;
        
        // For Excel/CSV files, check if we have publication numbers and kind codes
        if (fileExtension === 'xls' || fileExtension === 'xlsx' || fileExtension === 'csv') {
          console.log('Publication numbers from spreadsheet:', response.data.publicationNumbers);
          console.log('Kind codes from spreadsheet:', response.data.kindCodes);
          
          const pubNumbersCount = response.data.publicationNumbers?.length || 0;
          const kindCodesCount = response.data.kindCodes?.length || 0;
          
          if (extractedIds.length === 0 && pubNumbersCount > 0) {
            // If no patent IDs were extracted but publication numbers exist
            toast.success(`No patent IDs were found, but ${pubNumbersCount} publication numbers were found. These have been added as potential patent IDs.`);
          } else {
            let message = `${extractedIds.length} patent IDs extracted from file.`;
            
            if (pubNumbersCount > 0 && kindCodesCount > 0) {
              message += ` Combined ${pubNumbersCount} publication numbers with ${kindCodesCount} kind codes.`;
            } else if (pubNumbersCount > 0) {
              message += ` Found ${pubNumbersCount} publication numbers.`;
            }
            
            toast.success(message);
            
            // If there's a note about kind code selection, show it
            if (response.data.note) {
              setTimeout(() => {
                toast.success(response.data.note);
              }, 500); // Show after a short delay
            }
          }
        } else {
          // For non-Excel files
          toast.success(`${extractedIds.length} patent IDs extracted from file`);
        }
        
        // Filter out duplicates
        const newIds = extractedIds.filter(id => !patentIds.includes(id));
        
        if (newIds.length > 0) {
          setPatentIds([...patentIds, ...newIds]);
        } else {
          toast.success('No new patent IDs found in the file');
        }
      } else {
        toast.error('Failed to extract patent IDs from file');
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
    
    // Add the current input value if it's not empty
    if (inputValue.trim()) {
      addPatentId();
    }
    
    // Submit all patent IDs if there are any
    if (patentIds.length > 0) {
      savePatentMutation.mutate({ ids: patentIds, folderName: folderName || undefined });
    } else if (inputValue.trim()) {
      // If input is not empty but not yet added to the list
      savePatentMutation.mutate({ ids: [inputValue.trim()], folderName: folderName || undefined });
      setInputValue('');
    }
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
            disabled={!inputValue.trim()}
          >
            Add
          </button>
        </div>
        
        <div className="folder-name-container">
          <label htmlFor="folder-name">Folder Name (optional):</label>
          <input
            id="folder-name"
            type="text"
            value={folderName}
            onChange={handleFolderNameChange}
            placeholder="Enter a name for this patent list"
            className="folder-name-input"
          />
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
    </div>
  );
};

export default SavedPatentList; 