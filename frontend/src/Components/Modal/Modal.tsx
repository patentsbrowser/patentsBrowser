import React, { useEffect } from 'react';
import './Modal.scss';
import { openModal, closeModal } from '../../utils/modalHelper';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  // Set global modal state when component mounts/unmounts
  useEffect(() => {
    // Set modal as open when component mounts
    openModal();
    
    // Clean up when component unmounts
    return () => {
      closeModal();
    };
  }, []);

  // Prevent closing when clicking inside the modal
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Close modal and update global state
  const handleClose = (e: React.MouseEvent) => {
    closeModal();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={handleModalClick}>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 