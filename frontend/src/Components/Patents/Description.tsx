import React from 'react';
import './Description.scss';

interface DescriptionProps {
  initialDescription: string;
  patentId: string;
  noDataMessage?: string;
}

const Description = ({ initialDescription, patentId, noDataMessage = "No description available for this patent" }: DescriptionProps) => {
  return (
    <div className="description-section">
      <div className="description-header">
        <h4>
          <span className="title-with-icon">
            Description
          </span>
        </h4>
      </div>
      <div className="description-content">
        {initialDescription ? (
          <p className="highlightable">{initialDescription}</p>
        ) : (
          <div className="no-data-message">
            <p>{noDataMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Description; 