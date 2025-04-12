import React, { useState, useEffect } from 'react';
import { PatentSummary } from './types';
import PatentDetails from './PatentDetails';
import Loader from '../Common/Loader';
import PatentSummaryCard from './PatentSummaryCard';
import { ApiSource } from '../../api/patents';
import { useAppSelector } from '../../Redux/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

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

  if (patentSummaries.length === 0) return null;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    onPageChange(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="patent-summaries">
      <div className="summaries-header">
        <h3>Patent Search Results</h3>
        <button 
          className="clear-results-button"
          onClick={onClearResults}
          aria-label="Clear results"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <div className="summaries-grid">
        {patentSummaries?.map((summary) => (
          <PatentSummaryCard
            key={summary.patentId}
            summary={summary}
            onViewDetails={onViewDetails}
            formatDate={formatDate}
            onPatentSelect={onPatentSelect}
            apiSource={apiSource}
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
            <button 
              className="close-details"
              onClick={() => setSelectedPatent(null)}
              aria-label="Close details"
            >
              ×
            </button>
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