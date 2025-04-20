import React, { useState, useEffect } from 'react';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import './PatentFolderSelector.scss'; // Reuse same styles

interface CustomFolder {
  _id: string;
  name: string;
  patentIds: string[];
}

interface MultiFolderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  patentIds: string[];
}

const MultiFolderSelector: React.FC<MultiFolderSelectorProps> = ({ 
  isOpen,
  onClose,
  patentIds
}) => {
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);
  
  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getCustomPatentList();
      setFolders(response.data || []);
      
      // Auto-select first folder if available
      if (response.data?.length > 0) {
        setSelectedFolder(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFolder(e.target.value);
  };
  
  const handleAddToFolder = async () => {
    if (!selectedFolder) {
      toast.error('Please select a folder');
      return;
    }
    
    if (patentIds.length === 0) {
      toast.error('No patents selected');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await authApi.addPatentsToFolder(selectedFolder, patentIds);
      
      // The response structure is { statusCode, message, data: { customList, addedCount, totalCount } }
      if (response.data && response.data.addedCount > 0) {
        toast.success(`${response.data.addedCount} patents added to folder successfully`);
        
        // If some patents were already in the folder
        if (response.data.addedCount < response.data.totalCount) {
          toast(`${response.data.totalCount - response.data.addedCount} patents were already in the folder`);
        }
        
        // Refresh folders in the sidebar
        const refreshEvent = new CustomEvent('refresh-custom-folders');
        window.dispatchEvent(refreshEvent);
      } else {
        toast('All patents were already in this folder');
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error adding patents to folder:', error);
      if (error.response?.data?.message === 'All patents are already in this folder') {
        toast('All patents are already in this folder');
      } else if (error.response?.status === 404) {
        toast.error('Folder not found. Please try again or create a new folder.');
      } else {
        toast.error('Failed to add patents to folder. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (!isOpen) return null;
  
  return (
    <div className="patent-folder-selector-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add {patentIds.length} Patent{patentIds.length !== 1 ? 's' : ''} to Folder</h3>
          <button className="close-button" onClick={onClose} disabled={isSubmitting}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="folder-search">
          <input
            type="text"
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        
        {isLoading ? (
          <div className="loading-message">Loading folders...</div>
        ) : (
          <>
            {filteredFolders.length === 0 ? (
              <div className="no-folders-message">
                {searchTerm ? 'No folders match your search.' : 'No folders found. Please create a folder first.'}
              </div>
            ) : (
              <div className="folder-list">
                {filteredFolders.map(folder => (
                  <div 
                    key={folder._id} 
                    className={`folder-item ${selectedFolder === folder._id ? 'selected' : ''}`}
                    onClick={() => setSelectedFolder(folder._id)}
                  >
                    <span className="folder-icon">📁</span>
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-count">({folder.patentIds.length})</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="modal-footer">
              <button 
                className="add-to-folder-button"
                onClick={handleAddToFolder}
                disabled={!selectedFolder || isLoading || isSubmitting}
              >
                <FontAwesomeIcon icon={faFolderPlus} /> Add to Folder
                {isSubmitting && ' ...'}
              </button>
              <button 
                className="cancel-button" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MultiFolderSelector; 