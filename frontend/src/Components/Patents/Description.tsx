import React from 'react';
import './Description.scss';

interface DescriptionProps {
  initialDescription: string;
  patentId: string;
}

const Description = ({ initialDescription, patentId }: DescriptionProps) => {
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
        <p className="highlightable">{initialDescription}</p>
      </div>
    </div>
  );
};

export default Description; 