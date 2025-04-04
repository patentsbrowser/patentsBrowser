import React, { useState, useEffect } from 'react';
import './PatentFolderSelector.scss';
import { patentApi } from '../../api/patents';
import Loader from '../Common/Loader';
import { toast } from 'react-hot-toast';

interface PatentFolderSelectorProps {
  onPatentsSelected: (patentIds: string[]) => void;
  onClose: () => void;
}

interface PatentFolder {
  id: string;
  name: string;
  patents: PatentItem[];
}

interface PatentItem {
  patentId: string;
  title?: string;
}

const PatentFolderSelector: React.FC<PatentFolderSelectorProps> = ({ 
  onPatentsSelected,
  onClose
}) => {
  const [folders, setFolders] = useState<PatentFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPatents, setSelectedPatents] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch folders on component mount
  useEffect(() => {
    const fetchFolders = async () => {
      setIsLoading(true);
      try {
        const response = await patentApi.getSavedPatents();
        setFolders(response.data || []);
        
        // Auto-select first folder if available
        if (response.data?.length > 0) {
          setSelectedFolder(response.data[0].id);
        }
      } catch (error) {
        toast.error('Failed to load patent folders');
        console.error('Error fetching folders:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFolders();
  }, []);
  
  // Handle folder selection
  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFolder(e.target.value);
    // Clear previously selected patents when folder changes
    setSelectedPatents({});
  };
  
  // Handle checkbox toggle
  const handlePatentToggle = (patentId: string) => {
    setSelectedPatents(prev => ({
      ...prev,
      [patentId]: !prev[patentId]
    }));
  };
  
  // Select all patents in the current folder
  const handleSelectAll = () => {
    if (!selectedFolder) return;
    
    const folder = folders.find(f => f.id === selectedFolder);
    if (!folder) return;
    
    const newSelection = { ...selectedPatents };
    folder.patents.forEach(patent => {
      newSelection[patent.patentId] = true;
    });
    
    setSelectedPatents(newSelection);
  };
  
  // Deselect all patents
  const handleDeselectAll = () => {
    setSelectedPatents({});
  };
  
  // Apply selection and send to parent component
  const handleApplySelection = () => {
    const selectedPatentIds = Object.keys(selectedPatents).filter(id => selectedPatents[id]);
    if (selectedPatentIds.length === 0) {
      toast.error('Please select at least one patent');
      return;
    }
    
    onPatentsSelected(selectedPatentIds);
    onClose();
  };
  
  // Get current folder's patents
  const getCurrentFolderPatents = (): PatentItem[] => {
    if (!selectedFolder) return [];
    const folder = folders.find(f => f.id === selectedFolder);
    return folder?.patents || [];
  };
  
  // Count selected patents
  const getSelectedCount = (): number => {
    return Object.values(selectedPatents).filter(Boolean).length;
  };
  
  return (
    <div className="patent-folder-selector">
      <div className="selector-header">
        <h3>Select Patents from Folders</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      {isLoading ? (
        <div className="loading-container">
          <Loader text="Loading folders..." fullScreen={false} />
        </div>
      ) : (
        <>
          <div className="folder-selection">
            <label htmlFor="folder-select">Patent Folder:</label>
            <select 
              id="folder-select"
              value={selectedFolder || ''}
              onChange={handleFolderChange}
              disabled={folders.length === 0}
            >
              {folders.length === 0 ? (
                <option value="">No folders available</option>
              ) : (
                folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} ({folder.patents.length} patents)
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div className="selection-actions">
            <button onClick={handleSelectAll} disabled={!selectedFolder}>Select All</button>
            <button onClick={handleDeselectAll} disabled={getSelectedCount() === 0}>Deselect All</button>
            <span className="selection-count">
              {getSelectedCount()} patent(s) selected
            </span>
          </div>
          
          <div className="patents-list">
            {getCurrentFolderPatents().length === 0 ? (
              <div className="empty-message">
                {!selectedFolder ? 'Please select a folder' : 'No patents in this folder'}
              </div>
            ) : (
              getCurrentFolderPatents().map(patent => (
                <div key={patent.patentId} className="patent-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!selectedPatents[patent.patentId]}
                      onChange={() => handlePatentToggle(patent.patentId)}
                    />
                    <span className="patent-id">{patent.patentId}</span>
                    {patent.title && <span className="patent-title">: {patent.title}</span>}
                  </label>
                </div>
              ))
            )}
          </div>
          
          <div className="selector-footer">
            <button 
              className="apply-button"
              onClick={handleApplySelection}
              disabled={getSelectedCount() === 0}
            >
              Add Selected Patents
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PatentFolderSelector; 