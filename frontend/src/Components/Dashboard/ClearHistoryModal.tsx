import React, { useState } from 'react';
import './ClearHistoryModal.scss';

interface RecentSearch {
  patentId: string;
  timestamp: number;
}

interface ClearHistoryModalProps {
  recentSearches: RecentSearch[];
  onClose: () => void;
  onClear: (selectedIds: string[]) => void;
}

const ClearHistoryModal = ({ recentSearches, onClose, onClear }: ClearHistoryModalProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(recentSearches.map(search => search.patentId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectId = (patentId: string) => {
    setSelectedIds(prev => 
      prev.includes(patentId)
        ? prev.filter(id => id !== patentId)
        : [...prev, patentId]
    );
  };

  const handleClear = () => {
    if (selectedIds.length > 0) {
      onClear(selectedIds);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Clear Recent Patent IDs</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="select-all">
            <label>
              <input
                type="checkbox"
                checked={selectedIds.length === recentSearches.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              Select All
            </label>
          </div>
          <div className="patent-list">
            {recentSearches.map((search) => (
              <div key={search.timestamp} className="patent-item">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(search.patentId)}
                    onChange={() => handleSelectId(search.patentId)}
                  />
                  <span className="patent-id">{search.patentId}</span>
                  <span className="search-time">
                    {new Date(search.timestamp).toLocaleTimeString()}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="clear-button"
            onClick={handleClear}
            disabled={selectedIds.length === 0}
          >
            Clear Selected
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearHistoryModal; 