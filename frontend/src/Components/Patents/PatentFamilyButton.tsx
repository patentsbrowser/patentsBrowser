import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
import FamilySearchModal from './FamilySearchModal';
import { ApiSource } from '../../api/patents';
import './PatentFamilyButton.scss';

interface PatentFamilyButtonProps {
  patentId: string;
  onPatentSelect: (patentId: string) => void;
  apiSource?: ApiSource;
}

const PatentFamilyButton: React.FC<PatentFamilyButtonProps> = ({ 
  patentId, 
  onPatentSelect,
  apiSource = 'unified'
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
          apiSource={apiSource}
        />
      )}
    </>
  );
};

export default PatentFamilyButton; 