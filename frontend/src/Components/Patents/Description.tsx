import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import './Description.scss';

interface DescriptionProps {
  initialDescription: string;
  patentId: string;
}

const Description = ({ initialDescription, patentId }: DescriptionProps) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const getDescription = () => {
    if (showFullDescription) {
      return initialDescription;
    }
    return initialDescription.substring(0, 200) + '...';
  };

  return (
    <div className="description-section">
      <h4 className="clickable" onClick={() => setShowFullDescription(!showFullDescription)}>
        <span className="title-with-icon">
          Description {showFullDescription ? '(Full)' : '(Summary)'}
          <FontAwesomeIcon 
            icon={showFullDescription ? faChevronUp : faChevronDown} 
            className="toggle-icon"
          />
        </span>
      </h4>
      <div className="description-content">
        <p>{getDescription()}</p>
      </div>
    </div>
  );
};

export default Description; 