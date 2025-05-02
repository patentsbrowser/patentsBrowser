import React, { useEffect, ReactNode } from 'react';
import { openModal, closeModal } from '../../utils/modalHelper';
import './ModalOverlay.scss';

interface ModalOverlayProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

/**
 * A reusable modal overlay component that properly manages global modal state
 * Use this component as the base for all modals in the application
 */
const ModalOverlay: React.FC<ModalOverlayProps> = ({ 
  children, 
  onClose, 
  className = '' 
}) => {
  // Register this modal with the global modal state when mounted
  useEffect(() => {
    openModal();
    return () => {
      closeModal();
    };
  }, []);

  // Handle closing the modal
  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
      onClose();
    }
  };

  return (
    <div 
      className={`modal-overlay ${className}`} 
      onClick={handleClose}
    >
      {children}
    </div>
  );
};

export default ModalOverlay; 