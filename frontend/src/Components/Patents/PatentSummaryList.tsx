import React, { useState, useEffect } from 'react';
import { PatentSummary } from './types';
import PatentDetails from './PatentDetails';
import Loader from '../Common/Loader';
import PatentSummaryCard from './PatentSummaryCard';
import { ApiSource } from '../../api/patents';
import { useAppSelector } from '../../Redux/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronLeft, faChevronRight, faFolderPlus, faCheck, faSave, faCog } from '@fortawesome/free-solid-svg-icons';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import PatentHighlighter from './PatentHighlighter';
import './PatentSummaryList.scss';

interface PatentSummaryListProps {
  patentSummaries: PatentSummary[];
  selectedPatent: PatentSummary | null;
  setSelectedPatent: (patent: PatentSummary | null) => void;
  onViewDetails: (patent: PatentSummary) => void;
  onPatentSelect: (patentId: string) => void;
  formatDate: (date: string | undefined) => string;
  apiSource: ApiSource;
  onClearResults: () => void;
  onPageChange: (page: number) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    resultsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Create a wrapper component that doesn't show anything if not open
const ControlledPatentHighlighter: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetSelector: string;
}> = ({ isOpen, onClose, targetSelector }) => {
  // Always render PatentHighlighter but with isOpen set to false when closed
  // This ensures highlights are applied but the UI is not visible
  return (
    <PatentHighlighter 
      targetSelector={targetSelector}
      isOpen={isOpen} // Pass the actual isOpen state
      onClose={onClose}
      data-location="search-results" // Add a data attribute to identify this instance
      props={undefined}    />
  );
};

const PatentSummaryList: React.FC<PatentSummaryListProps> = ({
  patentSummaries,
  selectedPatent,
  setSelectedPatent,
  onViewDetails,
  onPatentSelect,
  formatDate,
  apiSource,
  onClearResults,
  onPageChange,
  pagination
}) => {
  const { isLoading } = useAppSelector((state) => state.patents);
  const [currentPage, setCurrentPage] = useState(pagination?.currentPage || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    return parseInt(localStorage.getItem('resultsPerPage') || '50', 10);
  });
  
  // States for patent selection and folder creation
  const [selectedPatentIds, setSelectedPatentIds] = useState<string[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [showSaveToCustomFolder, setShowSaveToCustomFolder] = useState(false);
  // Add state for highlighter
  const [isHighlighterOpen, setIsHighlighterOpen] = useState(() => {
    // Initialize from localStorage if available
    const savedState = localStorage.getItem('patentHighlighterOpen');
    return savedState ? JSON.parse(savedState) : false;
  });

  // Save highlighter state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('patentHighlighterOpen', JSON.stringify(isHighlighterOpen));
  }, [isHighlighterOpen]);

  // Update itemsPerPage when localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'resultsPerPage') {
        const newItemsPerPage = parseInt(e.newValue || '50', 10);
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page when items per page changes
        onPageChange(1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [onPageChange]);

  // Also listen for changes in the same window
  useEffect(() => {
    const newItemsPerPage = parseInt(localStorage.getItem('resultsPerPage') || '50', 10);
    if (newItemsPerPage !== itemsPerPage) {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
      onPageChange(1);
    }
  }, [localStorage.getItem('resultsPerPage'), itemsPerPage, onPageChange]);

  // Update current page when pagination prop changes
  useEffect(() => {
    if (pagination?.currentPage) {
      setCurrentPage(pagination.currentPage);
    }
  }, [pagination?.currentPage]);

  // Handle patent selection
  const handlePatentSelection = (patentId: string, selected: boolean) => {
    if (selected) {
      setSelectedPatentIds(prev => [...prev, patentId]);
    } else {
      setSelectedPatentIds(prev => prev.filter(id => id !== patentId));
    }
  };

  // Properly handle viewing details - ensure we disable highlighter to prevent API loops
  const handleViewDetails = (patent: PatentSummary) => {
    // If highlighter is open, just hide it before viewing details to prevent API issues
    // But don't disable/clear the highlights
    if (isHighlighterOpen) {
      setIsHighlighterOpen(false);
    }
    
    // Call the original onViewDetails handler
    onViewDetails(patent);
  }

  // Handle "Select All" toggle
  const toggleSelectAll = () => {
    if (selectedPatentIds.length === patentSummaries.length) {
      // If all are selected, deselect all
      setSelectedPatentIds([]);
    } else {
      // Otherwise, select all
      setSelectedPatentIds(patentSummaries.map(patent => patent.patentId));
    }
  };

  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      // Use saveCustomPatentList with source parameter set to 'folderName' to ensure it appears in CustomSearch
      await authApi.saveCustomPatentList(folderName, selectedPatentIds, 'folderName');
      toast.success(`Created folder "${folderName}" with ${selectedPatentIds.length} patents`);
      
      // Dispatch a custom event to notify the DashboardSidebar to refresh
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setIsCreatingFolder(false);
      setFolderName('');
      setSelectedPatentIds([]);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder. Please try again.');
    }
  };

  // Handle saving selected patents to Custom folder in DashboardSidebar
  const handleSaveToCustomFolder = async () => {
    if (selectedPatentIds.length === 0) {
      toast.error('Please select at least one patent');
      return;
    }

    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      // Save the patents directly to the Custom folder with 'folderName' source
      await authApi.saveCustomPatentList(folderName, selectedPatentIds, 'folderName');
      toast.success(`Saved ${selectedPatentIds.length} patents to "${folderName}" in Custom folder`);
      
      // Dispatch a custom event to notify the DashboardSidebar to refresh
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setShowSaveToCustomFolder(false);
      setFolderName('');
      setSelectedPatentIds([]);
    } catch (error) {
      console.error('Error saving to Custom folder:', error);
      toast.error('Failed to save to Custom folder. Please try again.');
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    onPageChange(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (patentSummaries.length === 0) return null;

  return (
    <div className={`patent-summaries ${isHighlighterOpen ? 'highlighter-active' : ''}`}>
      {/* Use our controlled wrapper component */}
      <ControlledPatentHighlighter 
        targetSelector=".highlightable" 
        isOpen={isHighlighterOpen}
        onClose={() => setIsHighlighterOpen(!isHighlighterOpen)}
      />

      <div className="summaries-header">
        <h3>Patent Search Results</h3>
        <div className="header-actions">
          {selectedPatentIds.length > 0 && (
            <div className="selection-actions">
              <span className="selected-count">{selectedPatentIds.length} patents selected</span>
              <button 
                className="folder-action-btn custom-folder-btn"
                onClick={() => setShowSaveToCustomFolder(true)}
                title="Save to Custom folder in Dashboard"
              >
                <FontAwesomeIcon icon={faSave} /> Save to Custom Folder
              </button>
              <button 
                className="folder-action-btn"
                onClick={() => setIsCreatingFolder(true)}
                title="Create folder with selected patents"
              >
                <FontAwesomeIcon icon={faFolderPlus} /> Create Folder
              </button>
            </div>
          )}
          <button
            className="select-all-button"
            onClick={toggleSelectAll}
            title={selectedPatentIds.length === patentSummaries.length ? "Deselect all" : "Select all"}
          >
            {selectedPatentIds.length === patentSummaries.length ? "Deselect All" : "Select All"}
          </button>
          <button 
            className={`highlighter-toggle-button ${isHighlighterOpen ? 'active' : ''}`}
            onClick={() => setIsHighlighterOpen(!isHighlighterOpen)}
            title="Toggle Patent Highlighter"
            aria-label="Toggle Patent Highlighter"
          >
            <FontAwesomeIcon icon={faCog} />
          </button>
          <button 
            className="clear-results-button"
            onClick={onClearResults}
            aria-label="Clear results"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>

      {isCreatingFolder && (
        <div className="create-folder-panel">
          <div className="create-folder-form">
            <input
              type="text"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="folder-name-input"
            />
            <button 
              className="create-btn" 
              onClick={handleCreateFolder}
              disabled={!folderName.trim() || selectedPatentIds.length === 0}
            >
              <FontAwesomeIcon icon={faCheck} /> Create
            </button>
            <button 
              className="cancel-btn"
              onClick={() => setIsCreatingFolder(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSaveToCustomFolder && (
        <div className="create-folder-panel">
          <div className="create-folder-form">
            <input
              type="text"
              placeholder="Enter Custom folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="folder-name-input"
            />
            <button 
              className="create-btn" 
              onClick={handleSaveToCustomFolder}
              disabled={!folderName.trim() || selectedPatentIds.length === 0}
            >
              <FontAwesomeIcon icon={faSave} /> Save to Custom
            </button>
            <button 
              className="cancel-btn"
              onClick={() => setShowSaveToCustomFolder(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="summaries-grid">
        {patentSummaries?.map((summary) => (
          <PatentSummaryCard
            key={summary.patentId}
            summary={summary}
            onViewDetails={handleViewDetails}
            formatDate={formatDate}
            onPatentSelect={onPatentSelect}
            apiSource={apiSource}
            isSelected={selectedPatentIds.includes(summary.patentId)}
            onSelect={handlePatentSelection}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPreviousPage}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          
          <div className="page-info">
            Page {currentPage} of {pagination.totalPages}
            {pagination.totalResults > 0 && (
              <span className="total-results"> ({pagination.totalResults} total results)</span>
            )}
          </div>
          
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      )}

      {selectedPatent && (
        <div className="full-details-section">
          <div className="section-header">
            <h3>Full Patent Details - {selectedPatent.patentId}</h3>
            <div className="section-actions">
              <button 
                className="close-details"
                onClick={() => setSelectedPatent(null)}
                aria-label="Close details"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
          <div className="patent-card">
            {isLoading || selectedPatent.status === 'loading' ? (
              <div className="loading-container">
                <Loader text={`Loading patent data for ${selectedPatent.patentId[0]}...`} />
              </div>
            ) : (
              <PatentDetails
                title={selectedPatent.title || 'No Title Available'}
                abstract={selectedPatent.abstract || 'No abstract available'}
                claims={selectedPatent.details?.claims || []}
                description={selectedPatent.details?.description || 'No description available'}
                figures={selectedPatent.details?.figures || []}
                familyMembers={selectedPatent.details?.family_members || []}
                patentId={selectedPatent.patentId[0]}
                onPatentSelect={onPatentSelect}
                apiSource={apiSource}
                initialFetch={selectedPatent.initialFetch || false}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatentSummaryList; 