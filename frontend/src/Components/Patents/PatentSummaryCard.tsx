import React, { useEffect, useState } from 'react';
import { PatentSummary } from './types';
import Loader from '../Common/Loader';
import { ApiSource } from '../../api/patents';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { markPatentAsViewed } from '../../Redux/slices/patentSlice';
import { RootState } from '../../Redux/store';

interface PatentSummaryCardProps {
  summary: PatentSummary;
  onViewDetails: (patent: PatentSummary) => void;
  formatDate: (date: string | undefined) => string;
  onPatentSelect?: (patentId: string) => void;
  apiSource?: ApiSource;
}
console.log('first')
const PatentSummaryCard: React.FC<PatentSummaryCardProps> = ({
  summary,
  onViewDetails,
  formatDate}) => {
  const dispatch = useAppDispatch();
  const viewedPatents = useAppSelector((state: RootState) => state.patents.viewedPatents);
  const isViewed = viewedPatents.includes(summary.patentId);
  
  const handleViewDetails = () => {
    // Mark patent as viewed in Redux store
    dispatch(markPatentAsViewed(summary.patentId));
    
    // Call the original onViewDetails handler
    onViewDetails(summary);
  };
  
  return (
    <div 
      key={summary.patentId[0]} 
      className={`summary-card ${summary.status} ${isViewed ? 'viewed' : ''}`}
    >
      <div className="summary-header">
        <span className="patent-id">{summary.patentId}</span>
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
            <h4>{summary.title || 'No Title Available'}</h4>
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
              <div className="abstract">
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
            </div>
          </div>
        ) : (
          <div className="error">
            <span className="error-message">{summary.error || 'Data not found'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatentSummaryCard; 