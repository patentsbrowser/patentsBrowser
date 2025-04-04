import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
import FamilySearchModal from './FamilySearchModal';
import './PatentFamilyButton.scss';

interface PatentFamilyButtonProps {
  patentId: string;
  onPatentSelect: (patentId: string) => void;
}

const PatentFamilyButton: React.FC<PatentFamilyButtonProps> = ({ 
  patentId, 
  onPatentSelect 
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button 
        className="patent-family-button" 
        onClick={handleOpenModal}
        title="View patent family members"
      >
        <FontAwesomeIcon icon={faProjectDiagram} className="button-icon" />
        <span className="button-text">Family Search</span>
      </button>

      {isModalOpen && (
        <FamilySearchModal 
          patentId={patentId} 
          onClose={handleCloseModal} 
          onPatentSelect={onPatentSelect} 
        />
      )}
    </>
  );
};

export default PatentFamilyButton; 