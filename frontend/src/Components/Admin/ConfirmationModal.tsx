import React from 'react';
import './Admin.scss';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Yes',
  cancelText = 'No',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          confirmColor: '#ef4444',
          hoverColor: '#dc2626'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          confirmColor: '#3b82f6',
          hoverColor: '#2563eb'
        };
      default:
        return {
          icon: '⚠️',
          confirmColor: '#f59e0b',
          hoverColor: '#d97706'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="confirmation-icon">{styles.icon}</div>
          <p className="confirmation-message">{message}</p>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onConfirm}
            style={{ 
              backgroundColor: styles.confirmColor,
              '&:hover': {
                backgroundColor: styles.hoverColor
              }
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 