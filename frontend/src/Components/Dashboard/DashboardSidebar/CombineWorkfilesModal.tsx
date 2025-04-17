import React, { useState } from 'react';
import './DashboardSidebar.scss';

interface WorkFile {
  name: string;
  patentIds: string[];
  timestamp: number;
  isCombined?: boolean;
}

interface CombineWorkfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorkFiles: WorkFile[];
  onCombine: (uniquePatentIds: string[], duplicateIds: string[]) => void;
}

const CombineWorkfilesModal: React.FC<CombineWorkfilesModalProps> = ({
  isOpen,
  onClose,
  selectedWorkFiles,
  onCombine
}) => {
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);

  if (!isOpen) return null;

  // Process patent IDs to find duplicates
  const processPatentIds = () => {
    const allPatentIds = selectedWorkFiles.flatMap(workFile => workFile.patentIds);
    const uniqueIds = new Set<string>();
    const duplicates = new Set<string>();

    allPatentIds.forEach(id => {
      if (uniqueIds.has(id)) {
        duplicates.add(id);
      } else {
        uniqueIds.add(id);
      }
    });

    setDuplicateIds(Array.from(duplicates));
    return {
      uniqueIds: Array.from(uniqueIds),
      duplicateIds: Array.from(duplicates)
    };
  };

  const handleCombine = () => {
    const { uniqueIds, duplicateIds } = processPatentIds();
    onCombine(uniqueIds, duplicateIds);
  };

  return (
    <div className="combine-workfiles-modal-overlay">
      <div className="combine-workfiles-modal">
        <div className="modal-header">
          <h2>Combine Selected Workfiles</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="selected-files-info">
            <h3>Selected Workfiles ({selectedWorkFiles.length})</h3>
            <ul>
              {selectedWorkFiles.map((workFile, index) => (
                <li key={index}>
                  <span className="workfile-name">{workFile.name}</span>
                  <span className="patent-count">({workFile.patentIds.length} patents)</span>
                </li>
              ))}
            </ul>
          </div>

          {duplicateIds.length > 0 && (
            <div className="duplicates-warning">
              <h3>Duplicate Patent IDs Found</h3>
              <p>The following patent IDs appear in multiple workfiles and will be included only once:</p>
              <ul>
                {duplicateIds.map((id, index) => (
                  <li key={index}>{id}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-actions">
            <button className="cancel-button" onClick={onClose}>Cancel</button>
            <button className="combine-button" onClick={handleCombine}>
              Combine Workfiles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombineWorkfilesModal; 