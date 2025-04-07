import React from 'react';
import { PatentSummary } from './types';
import PatentDetails from './PatentDetails';
import Loader from '../Common/Loader';
import PatentSummaryCard from './PatentSummaryCard';
import { ApiSource } from '../../api/patents';

interface PatentSummaryListProps {
  patentSummaries: PatentSummary[];
  selectedPatent: PatentSummary | null;
  setSelectedPatent: (patent: PatentSummary | null) => void;
  onViewDetails: (patent: PatentSummary) => void;
  onPatentSelect: (patentId: string) => void;
  patentsState: any; // Type from Redux state
  formatDate: (date: string | undefined) => string;
  apiSource: ApiSource;
}

const PatentSummaryList: React.FC<PatentSummaryListProps> = ({
  patentSummaries,
  selectedPatent,
  setSelectedPatent,
  onViewDetails,
  onPatentSelect,
  patentsState,
  formatDate,
  apiSource
}) => {
  if (patentSummaries.length === 0) return null;

  return (
    <div className="patent-summaries">
      <h3>Patent Search Results</h3>
      <div className="summaries-grid">
        {patentSummaries.map((summary) => (
          <PatentSummaryCard
            key={summary.patentId[0]}
            summary={summary}
            onViewDetails={onViewDetails}
            formatDate={formatDate}
            onPatentSelect={onPatentSelect}
            apiSource={apiSource}
          />
        ))}
      </div>

      {selectedPatent && (
        <div className="full-details-section">
          <div className="section-header">
            <h3>Full Patent Details - {selectedPatent.patentId[0]}</h3>
            <button 
              className="close-details"
              onClick={() => setSelectedPatent(null)}
              aria-label="Close details"
            >
              ×
            </button>
          </div>
          <div className="patent-card">
            {patentsState.isLoading || selectedPatent.status === 'loading' ? (
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