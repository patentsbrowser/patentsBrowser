import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import './Claims.scss';

interface ClaimsProps {
  initialClaims: Array<{
    description: string;
    ucid: string;
  }>;
  patentId: string;
}

const Claims = ({ initialClaims }: ClaimsProps) => {
  const [showFullClaims, setShowFullClaims] = useState(false);

  const getFirstLine = (text: string | undefined) => {
    if (!text) return '';
    return text.split('\n')[0];
  };

  const renderClaimsList = () => {
    if (showFullClaims) {
      return initialClaims.map((claim, index) => (
        <div key={index} className="claim-item">
          <div className="claim-content">
            <p>
              <span className="claim-index">{index + 1}</span>
              {claim.description || ''}
            </p>
            {claim.ucid && <small className="claim-id">ID: {claim.ucid}</small>}
          </div>
        </div>
      ));
    }

    // Show only first line of each claim by default
    return initialClaims.map((claim, index) => (
      <div key={index} className="claim-item">
        <div className="claim-content">
          <p className="claim-preview">
            <span className="claim-index">{index + 1}</span>
            {getFirstLine(claim.description)}
            <span className="ellipsis">...</span>
          </p>
          {claim.ucid && <small className="claim-id">ID: {claim.ucid}</small>}
        </div>
      </div>
    ));
  };

  return (
    <div className="claims-section">
      <h4 className="clickable" onClick={() => setShowFullClaims(!showFullClaims)}>
        <span className="title-with-icon">
          Claims {showFullClaims ? '(Full)' : '(Summary)'}
          <FontAwesomeIcon 
            icon={showFullClaims ? faChevronUp : faChevronDown} 
            className="toggle-icon"
          />
        </span>
      </h4>
      <div className="claims-content">
        {renderClaimsList()}
      </div>
    </div>
  );
};

export default Claims; 