import React, { useEffect, useState } from 'react';
import { PatentSummary } from './types';
import Loader from '../Common/Loader';
import { ApiSource } from '../../api/patents';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { markPatentAsViewed } from '../../Redux/slices/patentSlice';
import { RootState } from '../../Redux/store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImport, faImage } from '@fortawesome/free-solid-svg-icons';
import WorkFileSelector from './WorkFileSelector';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';

interface PatentSummaryCardProps {
  summary: PatentSummary;
  onViewDetails: (patent: PatentSummary) => void;
  formatDate: (date: string | undefined) => string;
  onPatentSelect?: (patentId: string) => void;
  apiSource?: ApiSource;
  isSelected?: boolean;
  onSelect?: (patentId: string, selected: boolean) => void;
  onViewFigures?: (patent: PatentSummary) => void;
}

const PatentSummaryCard: React.FC<PatentSummaryCardProps> = ({
  summary,
  onViewDetails,
  formatDate,
  onPatentSelect,
  apiSource,
  isSelected = false,
  onSelect,
  onViewFigures,
}) => {
  const dispatch = useAppDispatch();
  const viewedPatents = useAppSelector((state: RootState) => state.patents.viewedPatents);
  const isViewed = viewedPatents.includes(summary.patentId);
  const [showWorkFileSelector, setShowWorkFileSelector] = useState(false);
  
  const handleViewDetails = () => {
    // Make sure we have a valid patentId
    if (summary.patentId) {
      // Mark patent as viewed in Redux store
      dispatch(markPatentAsViewed(summary.patentId));
      
      // Call the original onViewDetails handler
      onViewDetails(summary);
    } else {
      console.error('Invalid patent ID:', summary.patentId);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(summary.patentId, e.target.checked);
    }
  };

  const handleAddToWorkFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowWorkFileSelector(true);
  };

  const handleWorkFileSelect = async (folderId: string, workFileName: string) => {
    try {
      const response = await authApi.addPatentsToWorkFile(folderId, workFileName, [summary.patentId]);
      toast.success(`Added patent to work file "${workFileName}"`);
      
      // Dispatch event to refresh the folder list
      const refreshEvent = new CustomEvent('refresh-custom-folders');
      window.dispatchEvent(refreshEvent);
      
      setShowWorkFileSelector(false);
    } catch (error) {
      console.error('Error adding patent to work file:', error);
      toast.error('Failed to add patent to work file');
    }
  };

  return (
    <>
      <div 
        key={summary.patentId[0]} 
        className={`summary-card ${summary.status} ${isViewed ? 'viewed' : ''} ${isSelected ? 'selected' : ''}`}
      >
        <div className="summary-header">
          <div className="patent-header-left">
            {onSelect && (
              <div className="patent-selection" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={handleCheckboxChange}
                  className="patent-checkbox"
                />
              </div>
            )}
            <span className="patent-id">{summary.patentId}</span>
          </div>
          <span className="status-indicator">
            {summary.status === 'loading' ? '⌛' : 
             summary.status === 'success' 
              ? (isViewed ? '👁️' : '✓') 
              : '✗'}
          </span>
        </div>
        <div className="summary-content">
          {summary.status === 'loading' ? (
            <div className="loading-container">
              <Loader text="Loading patent data..." fullScreen={false} />
            </div>
          ) : summary.status === 'success' ? (
            <div className="success">
              <h4 className="highlightable">{summary.title || 'No Title Available'}</h4>
              <div className="patent-info">
                <div className="info-item">
                  <span className="label">Assignee:</span>
                  <span className="value">
                    {summary.details?.assignee_current && summary.details.assignee_current.length > 0
                      ? summary.details.assignee_current.join(', ')
                      : 'No assignee found'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Priority Date:</span>
                  <span className="value">{formatDate(summary.details?.priority_date)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Publication Date:</span>
                  <span className="value">{formatDate(summary.details?.publication_date)}</span>
                </div>
              </div>
              <div className="abstract-section">
                <h5 className="abstract-title">Abstract</h5>
                <div className="abstract highlightable full-abstract">
                  {summary.abstract || 'No abstract available'}
                </div>
              </div>
              <div className="action-buttons">
                <button 
                  onClick={handleViewDetails}
                  className="view-details"
                >
                  View Details
                </button>
                <button
                  onClick={handleAddToWorkFile}
                  className="add-to-workfile"
                >
                  <FontAwesomeIcon icon={faFileImport} /> Workfile Addition
                </button>
                {onViewFigures && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewFigures(summary);
                    }}
                    className="view-figures"
                  >
                    <FontAwesomeIcon icon={faImage} /> View Figures
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="error">
              <span className="error-message">{summary.error || 'Data not found'}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* WorkFile Selector Modal */}
      {showWorkFileSelector && (
        <WorkFileSelector
          isOpen={showWorkFileSelector}
          onClose={() => setShowWorkFileSelector(false)}
          onSelect={handleWorkFileSelect}
          selectedPatentIds={[summary.patentId]}
        />
      )}
    </>
  );
};

export default PatentSummaryCard; 