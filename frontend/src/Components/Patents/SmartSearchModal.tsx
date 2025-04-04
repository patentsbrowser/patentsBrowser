import React, { useState } from 'react';
import './SmartSearchModal.scss';

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  patentIds: string[];
  onSearch: (selectedIds: string[]) => void;
  selectedApi: 'serpapi' | 'unified';
}

const SmartSearchModal: React.FC<SmartSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  patentIds, 
  onSearch,
  selectedApi
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([...patentIds]);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    setSelectedIds([...patentIds]);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleCheckboxChange = (patentId: string) => {
    if (selectedIds.includes(patentId)) {
      setSelectedIds(selectedIds.filter(id => id !== patentId));
    } else {
      setSelectedIds([...selectedIds, patentId]);
    }
  };

  const formatPatentId = (patentId: string): string => {
    // For SerpAPI, remove hyphens and any other special characters
    if (selectedApi === 'serpapi') {
      return patentId.replace(/[-]/g, '');
    }
    return patentId;
  };

  const handleSearch = () => {
    if (selectedIds.length === 0) {
      return;
    }
    
    // Format patent IDs according to the selected API before sending
    const formattedIds = selectedIds.map(id => formatPatentId(id));
    onSearch(formattedIds);
    onClose();
  };

  return (
    <div className="smart-search-modal-overlay">
      <div className="smart-search-modal">
        <div className="modal-header">
          <h3>Smart Patent Search</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <div className="selection-controls">
            <p>Select the patent IDs you want to search:</p>
            <div className="selection-buttons">
              <button type="button" onClick={handleSelectAll}>Select All</button>
              <button type="button" onClick={handleDeselectAll}>Deselect All</button>
            </div>
          </div>
          
          <div className="patent-list">
            {patentIds.length === 0 ? (
              <p className="no-patents">No patent IDs found. Please enter valid patent IDs.</p>
            ) : (
              patentIds.map((patentId) => (
                <div key={patentId} className="patent-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(patentId)}
                      onChange={() => handleCheckboxChange(patentId)}
                    />
                    <span className="patent-id">{patentId}</span>
                    {selectedApi === 'serpapi' && patentId.includes('-') && (
                      <span className="formatted-id">
                        → {formatPatentId(patentId)}
                      </span>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button 
            className="search-button" 
            onClick={handleSearch}
            disabled={selectedIds.length === 0}
          >
            Search Patents ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartSearchModal; 