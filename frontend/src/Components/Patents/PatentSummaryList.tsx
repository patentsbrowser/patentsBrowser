import React, { useState, useEffect, useRef } from 'react';
import { PatentSummary } from './types';
import PatentDetails from './PatentDetails';
import Loader from '../Common/Loader';
import PatentSummaryCard from './PatentSummaryCard';
import { ApiSource } from '../../api/patents';
import { useAppSelector, useAppDispatch } from '../../Redux/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronLeft, faChevronRight, faFolderPlus, faCheck, faSave, faCog, faFilter, faFileImport, faImage } from '@fortawesome/free-solid-svg-icons';
import { authApi } from '../../api/auth';
import { toast } from 'react-toastify';
import PatentHighlighter from './PatentHighlighter';
import './PatentSummaryList.scss';
import MultiFolderSelector from './MultiFolderSelector';
import WorkFileSelector from './WorkFileSelector';
import { setSearchResults } from '../../Redux/slices/patentSlice';
import { patentApi } from '../../api/patents';
import FigureViewer from './FigureViewer';
// import { CustomPatentList } from '../../api/patents';

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
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.patents);
  const [currentPage, setCurrentPage] = useState(pagination?.currentPage || 1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    return parseInt(localStorage.getItem('resultsPerPage') || '50', 10);
  });
  
  // States for patent selection and folder creation
  const [selectedPatentIds, setSelectedPatentIds] = useState<string[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [workFileName, setWorkFileName] = useState('workfile1');
  const [showSaveToCustomFolder, setShowSaveToCustomFolder] = useState(false);
  const [showAddToExistingFolder, setShowAddToExistingFolder] = useState(false);
  const [showWorkFileSelector, setShowWorkFileSelector] = useState(false);
  
  // Add state for highlighter
  const [isHighlighterOpen, setIsHighlighterOpen] = useState(() => {
    // Initialize from localStorage if available
    const savedState = localStorage.getItem('patentHighlighterOpen');
    return savedState ? JSON.parse(savedState) : false;
  });

  // Add state for FigureViewer
  const [showFigureViewer, setShowFigureViewer] = useState(false);
  const [selectedPatentForFigures, setSelectedPatentForFigures] = useState<PatentSummary | null>(null);

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

  // Add effect to handle body class for full details view
  useEffect(() => {
    if (selectedPatent) {
      document.body.classList.add('patent-details-open');
    } else {
      document.body.classList.remove('patent-details-open');
    }
    return () => {
      document.body.classList.remove('patent-details-open');
    };
  }, [selectedPatent]);

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

  // Add new state for modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  // Modify the existing folder creation logic
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    if (!workFileName.trim()) {
      toast.error('Please enter a workfile name');
      return;
    }

    try {
      // Create the folder with a single workfile
      const response = await authApi.saveCustomPatentList(folderName, selectedPatentIds, 'folderName', workFileName);
      
      if (!response.data || !response.data._id) {
        throw new Error('Failed to create folder: No folder ID returned');
      }
      
      toast.success(`Created folder "${folderName}" with workfile "${workFileName}" containing ${selectedPatentIds.length} patents`);
      
      // Dispatch a custom event to notify the DashboardSidebar to refresh
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setShowNewFolderModal(false);
      setFolderName('');
      setWorkFileName('workfile1'); // Reset workfile name
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

    if (!workFileName.trim()) {
      toast.error('Please enter a workfile name');
      return;
    }

    try {
      // Create a new folder with the specified workfile name
      const response = await authApi.saveCustomPatentList(folderName, selectedPatentIds, 'importedList', workFileName);
      
      if (!response.data || !response.data._id) {
        throw new Error('Failed to create folder: No folder ID returned');
      }
      
      toast.success(`Created folder "${folderName}" with workfile "${workFileName}" containing ${selectedPatentIds.length} patents`);
      
      // Dispatch a custom event to notify the DashboardSidebar to refresh
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setShowSaveToCustomFolder(false);
      setFolderName('');
      setWorkFileName('workfile1'); // Reset workfile name
      setSelectedPatentIds([]);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder. Please try again.');
    }
  };

  // New handler for adding to existing folder
  const handleAddToExistingFolder = () => {
    if (selectedPatentIds.length === 0) {
      toast.error('Please select at least one patent');
      return;
    }
    
    setShowAddToExistingFolder(true);
  };

  // New handler for adding to workfile
  const handleAddToWorkFile = () => {
    if (selectedPatentIds.length === 0) {
      toast.error('Please select at least one patent');
      return;
    }
    
    setShowWorkFileSelector(true);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    onPageChange(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResultsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    localStorage.setItem('resultsPerPage', newValue);
    setItemsPerPage(parseInt(newValue, 10));
    setCurrentPage(1); // Reset to first page
    onPageChange(1);
  };

  // Add new state for delete operations
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [deleteType, setDeleteType] = useState<'folder' | 'workfile' | 'patent' | null>(null);
  const [selectedFolderForDelete, setSelectedFolderForDelete] = useState<string | null>(null);
  const [selectedWorkFileForDelete, setSelectedWorkFileForDelete] = useState<string | null>(null);
  const [selectedPatentForDelete, setSelectedPatentForDelete] = useState<string | null>(null);

  // Add delete handlers
  const handleDeleteFolder = async (folderId: string) => {
    try {
      await authApi.deleteFolder(folderId);
      toast.success('Folder deleted successfully');
      
      // Dispatch event to refresh the folder list
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setShowDeleteOptions(false);
      setDeleteType(null);
      setSelectedFolderForDelete(null);
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const handleDeleteWorkFile = async (folderId: string, workFileName: string) => {
    try {
      // First get the folder
      const response = await authApi.getImportedLists();
      const folder = response.data.find((f: any) => f._id === folderId);
      
      if (!folder) {
        throw new Error('Folder not found');
      }
      
      // Remove the workfile from the folder's workFiles array
      folder.workFiles = folder.workFiles.filter((wf: any) => wf.name !== workFileName);
      
      // Update the folder
      await authApi.saveCustomPatentList(folder.name, folder.patentIds, 'importedList');
      
      toast.success(`Workfile "${workFileName}" deleted successfully`);
      
      // Dispatch event to refresh the folder list
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setShowDeleteOptions(false);
      setDeleteType(null);
      setSelectedFolderForDelete(null);
      setSelectedWorkFileForDelete(null);
    } catch (error) {
      console.error('Error deleting workfile:', error);
      toast.error('Failed to delete workfile');
    }
  };

  const handleDeletePatent = async (folderId: string, patentId: string) => {
    try {
      await authApi.removePatentFromFolder(folderId, patentId);
      toast.success('Patent removed successfully');
      
      // Dispatch event to refresh the folder list
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setShowDeleteOptions(false);
      setDeleteType(null);
      setSelectedFolderForDelete(null);
      setSelectedPatentForDelete(null);
    } catch (error) {
      console.error('Error removing patent:', error);
      toast.error('Failed to remove patent');
    }
  };

  // Add search handler
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchPatents = async (folderId: string, workFileName: string, patentIds: string[]) => {
    try {
      setIsSearching(true);
      
      // Use patentApi to search for patents
      const result = await patentApi.searchMultiplePatentsUnified(patentIds, 'direct');
      
      if (result?.hits?.hits) {
        const patents = result.hits.hits.map((hit: any) => {
          const source = hit._source;
          return {
            patentId: source?.ucid_spif?.[0] || source?.publication_number || hit._id || '',
            status: 'success' as const,
            title: source?.title || '',
            abstract: source?.abstract || '',
            details: {
              assignee_current: source?.assignee_current || [],
              assignee_original: source?.assignee_original || [],
              assignee_parent: source?.assignee_parent || [],
              priority_date: source?.priority_date || '',
              publication_date: source?.publication_date || '',
              grant_date: source?.grant_date || '',
              expiration_date: source?.expiration_date || '',
              application_date: source?.application_date || '',
              application_number: source?.application_number || '',
              grant_number: source?.grant_number || '',
              publication_number: source?.publication_number || '',
              publication_status: source?.publication_status || '',
              publication_type: source?.publication_type || '',
              type: source?.type || '',
              country: source?.country || '',
              kind_code: source?.kind_code || '',
              inventors: source?.inventors || [],
              examiner: source?.examiner || [],
              law_firm: source?.law_firm || '',
              cpc_codes: source?.cpc_codes || [],
              uspc_codes: source?.uspc_codes || [],
              num_cit_pat: source?.num_cit_pat || 0,
              num_cit_npl: source?.num_cit_npl || 0,
              num_cit_pat_forward: source?.num_cit_pat_forward || 0,
              citations_pat_forward: source?.citations_pat_forward || [],
              portfolio_score: source?.portfolio_score || 0,
              litigation_score: source?.litigation_score || 0,
              rating_broadness: source?.rating_broadness || '',
              rating_citation: source?.rating_citation || '',
              rating_litigation: source?.rating_litigation || '',
              rating_validity: source?.rating_validity || '',
            }
          };
        });
        
        // Update Redux state with search results
        dispatch(setSearchResults(patents));
        
        // Add to search history
        for (const patentId of patentIds) {
          await authApi.addToSearchHistory(patentId, 'folder-search');
        }
        
        // Dispatch event to notify history component
        window.dispatchEvent(new CustomEvent('patent-searched'));
        
        toast.success('Patents searched successfully');
      } else {
        toast.error('No results found');
      }
    } catch (error) {
      console.error('Error searching patents:', error);
      toast.error('Failed to search patents');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const response = await patentApi.searchPatents(searchQuery, 'unified' as ApiSource);
      if (response?.data) {
        dispatch(setSearchResults(response.data));
      }
      setSearchQuery('');
    } catch (error: any) {
      console.error('Error searching patents:', error);
      toast.error(error?.message || 'Failed to search patents');
    } finally {
      setIsSearching(false);
    }
  };

  // Add handler for viewing figures
  const handleViewFigures = (patent: PatentSummary) => {
    setSelectedPatentForFigures(patent);
    setShowFigureViewer(true);
  };

  // Add handler for closing FigureViewer
  const handleCloseFigureViewer = () => {
    setShowFigureViewer(false);
    setSelectedPatentForFigures(null);
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
          <button 
            className={`highlighter-toggle-button ${isHighlighterOpen ? 'active' : ''}`}
            onClick={() => setIsHighlighterOpen(!isHighlighterOpen)}
            title="Patent Highlighter Settings"
            aria-label="Patent Highlighter Settings"
          >
            <FontAwesomeIcon icon={faCog} /> Highlighter
          </button>
          {selectedPatentIds.length > 0 && (
            <div className="selection-actions">
              <span className="selected-count">{selectedPatentIds.length} patents selected</span>
              <button 
                className="folder-action-btn custom-folder-btn"
                onClick={() => setShowNewFolderModal(true)}
                title="Create new folder"
              >
                <FontAwesomeIcon icon={faFolderPlus} /> New Folder
              </button>
              <button 
                className="folder-action-btn workfile-btn"
                onClick={handleAddToWorkFile}
                title="Add to workfile"
              >
                <FontAwesomeIcon icon={faFileImport} /> Workfile Addition
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
            className="clear-results-button"
            onClick={onClearResults}
            aria-label="Clear results"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>

      {/* Replace the existing create folder panel with a modal */}
      {showNewFolderModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Folder</h3>
              <button 
                className="close-button"
                onClick={() => setShowNewFolderModal(false)}
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="folderName">Folder Name</label>
                <input
                  id="folderName"
                  type="text"
                  placeholder="Enter folder name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="folder-name-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="workFileName">Workfile Name</label>
                <input
                  id="workFileName"
                  type="text"
                  placeholder="Enter workfile name"
                  value={workFileName}
                  onChange={(e) => setWorkFileName(e.target.value)}
                  className="folder-name-input"
                />
              </div>
          
            </div>
            <div className="modal-footer">
              <button 
                className="create-btn" 
                onClick={handleCreateFolder}
                disabled={!folderName.trim() || !workFileName.trim() || selectedPatentIds.length === 0}
              >
                <FontAwesomeIcon icon={faCheck} /> Create Folder
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowNewFolderModal(false);
                  setWorkFileName('workfile1'); // Reset workfile name when canceling
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveToCustomFolder && (
        <div className="create-folder-panel">
          <div className="save-to-custom-button">
            <input
              type="text"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="custom-folder-input"
            />
            <input
              type="text"
              placeholder="Enter workfile name"
              value={workFileName}
              onChange={(e) => setWorkFileName(e.target.value)}
              className="custom-folder-input"
            />
            <button 
              className="save-to-custom-btn" 
              onClick={handleSaveToCustomFolder}
              disabled={!folderName.trim() || !workFileName.trim() || selectedPatentIds.length === 0}
            >
              <FontAwesomeIcon icon={faSave} /> Save to Custom
            </button>
            <button 
              className="cancel-action-btn"
              onClick={() => {
                setShowSaveToCustomFolder(false);
                setWorkFileName('workfile1'); // Reset workfile name when canceling
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add the MultiFolderSelector component */}
      {showAddToExistingFolder && (
        <MultiFolderSelector
          isOpen={showAddToExistingFolder}
          onClose={() => setShowAddToExistingFolder(false)}
          patentIds={selectedPatentIds}
        />
      )}

      {/* Add the WorkFileSelector component */}
      {showWorkFileSelector && (
        <WorkFileSelector
          isOpen={showWorkFileSelector}
          onClose={() => setShowWorkFileSelector(false)}
          onSelect={async (folderId: string, workFileName: string) => {
            try {
              console.log('PatentSummaryList onSelect called with:', {
                folderId,
                workFileName,
                selectedPatentIds
              });
              
              if (!Array.isArray(selectedPatentIds) || selectedPatentIds.length === 0) {
                toast.error('No patents selected to add to workfile');
                return;
              }
              
              const response = await authApi.addPatentsToWorkFile(folderId, workFileName, selectedPatentIds);
              toast.success(`Added ${selectedPatentIds.length} patents to work file "${workFileName}"`);
              
              // Dispatch event to refresh the folder list
              const refreshEvent = new CustomEvent('refresh-custom-folders');
              window.dispatchEvent(refreshEvent);
              
              setShowWorkFileSelector(false);
            } catch (error) {
              console.error('Error adding patents to work file:', error);
              toast.error('Failed to add patents to work file');
            }
          }}
          selectedPatentIds={selectedPatentIds}
        />
      )}

      <div className="summaries-grid">
        {pagination ? (
          // Paginate the results
          patentSummaries
            .slice(
              (pagination.currentPage - 1) * pagination.resultsPerPage,
              pagination.currentPage * pagination.resultsPerPage
            )
            .map((summary) => (
              <div key={summary.patentId} className="patent-summary-card">
                <PatentSummaryCard
                  summary={summary}
                  onViewDetails={handleViewDetails}
                  formatDate={formatDate}
                  onPatentSelect={onPatentSelect}
                  apiSource={apiSource}
                  isSelected={selectedPatentIds.includes(summary.patentId)}
                  onSelect={handlePatentSelection}
                  onViewFigures={handleViewFigures}
                />
              </div>
            ))
        ) : (
          // If no pagination info, show all results
          patentSummaries.map((summary) => (
            <div key={summary.patentId} className="patent-summary-card">
              <PatentSummaryCard
                summary={summary}
                onViewDetails={handleViewDetails}
                formatDate={formatDate}
                onPatentSelect={onPatentSelect}
                apiSource={apiSource}
                isSelected={selectedPatentIds.includes(summary.patentId)}
                onSelect={handlePatentSelection}
                onViewFigures={handleViewFigures}
              />
            </div>
          ))
        )}
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

      {/* Add delete options modal */}
      {showDeleteOptions && (
        <div className="delete-options-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Options</h3>
              <button className="close-button" onClick={() => setShowDeleteOptions(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {deleteType === 'folder' && (
                <div className="delete-folder-form">
                  <p>Are you sure you want to delete this folder and all its contents?</p>
                  <div className="form-actions">
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteFolder(selectedFolderForDelete!)}
                    >
                      Delete Folder
                    </button>
                    <button 
                      className="cancel-btn"
                      onClick={() => setShowDeleteOptions(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {deleteType === 'workfile' && (
                <div className="delete-workfile-form">
                  <p>Are you sure you want to delete this workfile?</p>
                  <div className="form-actions">
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteWorkFile(selectedFolderForDelete!, selectedWorkFileForDelete!)}
                    >
                      Delete Workfile
                    </button>
                    <button 
                      className="cancel-btn"
                      onClick={() => setShowDeleteOptions(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {deleteType === 'patent' && (
                <div className="delete-patent-form">
                  <p>Are you sure you want to remove this patent from the workfile?</p>
                  <div className="form-actions">
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeletePatent(selectedFolderForDelete!, selectedPatentForDelete!)}
                    >
                      Remove Patent
                    </button>
                    <button 
                      className="cancel-btn"
                      onClick={() => setShowDeleteOptions(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add FigureViewer component */}
      {showFigureViewer && selectedPatentForFigures && (
        <FigureViewer
          patentId={selectedPatentForFigures.patentId}
          onClose={handleCloseFigureViewer}
          onNextRequested={() => {
            // Find the next patent in the list
            const currentIndex = patentSummaries.findIndex(p => p.patentId === selectedPatentForFigures.patentId);
            if (currentIndex < patentSummaries.length - 1) {
              handleViewFigures(patentSummaries[currentIndex + 1]);
            }
          }}
          patentIndex={patentSummaries.findIndex(p => p.patentId === selectedPatentForFigures.patentId) + 1}
          totalPatents={patentSummaries.length}
        />
      )}
    </div>
  );
};

export default PatentSummaryList; 