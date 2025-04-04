import  { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import './FamilyMembers.scss';

interface FamilyMember {
  publication_number: string;
  publication_date: string;
  kind_code: string;
}

interface FamilyMembersProps {
  familyMembers: FamilyMember[];
  onPatentSelect: (patentId: string) => void;
}

const FamilyMembers = ({ familyMembers, onPatentSelect }: FamilyMembersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show only first 3 members when collapsed
  const displayedMembers = isExpanded ? familyMembers : familyMembers.slice(0, 3);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid date
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if error occurs
    }
  };

  const handlePatentClick = (publicationNumber: string) => {
    onPatentSelect(publicationNumber);
  };

  return (
    <div className="family-members-section">
      <h4 className="clickable" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="title-with-icon">
          Family Members {isExpanded ? '(Full)' : '(Summary)'}
          <FontAwesomeIcon 
            icon={isExpanded ? faChevronUp : faChevronDown} 
            className="toggle-icon"
          />
        </span>
      </h4>
      <div className="family-members-list">
        {displayedMembers.map((member, index) => (
          <div key={index} className="family-member-item">
            <span 
              className="member-number clickable"
              onClick={() => handlePatentClick(member.publication_number)}
              title="Click to view this patent"
            >
              {member.publication_number}
            </span>
            <span className="member-date">{formatDate(member.publication_date)}</span>
            <span className="member-kind">{member.kind_code}</span>
          </div>
        ))}
        {!isExpanded && familyMembers.length > 3 && (
          <div className="show-more-info" onClick={() => setIsExpanded(true)}>
            {familyMembers.length - 3} more family members...
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyMembers; 