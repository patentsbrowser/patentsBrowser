import React from 'react';
import './Claims.scss';

interface ClaimsProps {
  initialClaims: Array<{
    description: string;
    ucid: string;
  }>;
  patentId: string;
  noDataMessage?: string;
}

const Claims = ({ initialClaims, noDataMessage = "No claims available for this patent" }: ClaimsProps) => {
  // Always render the full claims without toggle functionality
  const renderClaimsList = () => {
    if (!initialClaims || initialClaims.length === 0) {
      return (
        <div className="no-data-message">
          <p>{noDataMessage}</p>
        </div>
      );
    }

    return initialClaims.map((claim, index) => (
      <div key={index} className="claim-item">
        <div className="claim-content">
          <p className="highlightable">
            <span className="claim-index">{index + 1}</span>
            {claim.description || ''}
          </p>
          {claim.ucid && <small className="claim-id">ID: {claim.ucid}</small>}
        </div>
      </div>
    ));
  };

  return (
    <div className="claims-section">
      <div className="claims-header">
        <h4>
          <span className="title-with-icon">
            Claims
          </span>
        </h4>
      </div>
      <div className="claims-content">
        {renderClaimsList()}
      </div>
    </div>
  );
};

export default Claims; 