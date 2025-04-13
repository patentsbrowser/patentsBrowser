import React, { useState, useEffect } from 'react';
import FigureViewer from './FigureViewer';
import './PatentFigureSearch.scss';

interface PatentFigureSearchProps {
  patentIds: string[];
}

const PatentFigureSearch: React.FC<PatentFigureSearchProps> = ({ patentIds }) => {
  const [showFigureViewer, setShowFigureViewer] = useState(false);
  const [currentPatentIndex, setCurrentPatentIndex] = useState(0);
  const [customPatentId, setCustomPatentId] = useState('');
  const [activePatentIds, setActivePatentIds] = useState<string[]>([]);
  
  // Parse custom patent IDs when input changes
  useEffect(() => {
    if (customPatentId.trim()) {
      const parsedIds = customPatentId
        .split(/[,\s]+/)
        .map(id => id.trim())
        .filter(id => id);
      setActivePatentIds(parsedIds);
    } else {
      setActivePatentIds([]);
    }
  }, [customPatentId]);

  const handleViewFigures = (e: React.MouseEvent) => {
    // Prevent default form submission behavior which might trigger search
    e.preventDefault();
    e.stopPropagation();
    
    if (patentIds.length > 0) {
      // Use search query patent IDs
      setCurrentPatentIndex(0);
      setShowFigureViewer(true);
    } else if (activePatentIds.length > 0) {
      // Use custom input patent IDs
      setCurrentPatentIndex(0);
      setShowFigureViewer(true);
    } else {
      alert('Please enter a patent ID or search for patents first');
    }
  };

  const handleCustomPatentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPatentId(e.target.value);
  };

  const handleNextPatent = () => {
    // Determine which patent ID array to use
    const idsToUse = patentIds.length > 0 ? patentIds : activePatentIds;
    
    if (idsToUse.length > 0) {
      // Move to the next patent in the sequence
      const nextIndex = currentPatentIndex + 1;
      
      if (nextIndex < idsToUse.length) {
        setCurrentPatentIndex(nextIndex);
        console.log(`Moving to next patent: ${idsToUse[nextIndex]} (${nextIndex + 1}/${idsToUse.length})`);
      } else {
        // We've reached the end of the patent list
        console.log('Reached the end of patent list, closing viewer');
        setShowFigureViewer(false);
        // Optional: Show a toast or message indicating completion
      }
    } else {
      // If we're in custom patent mode with a single ID, just close the viewer
      setShowFigureViewer(false);
    }
  };

  const closeFigureViewer = () => {
    setShowFigureViewer(false);
  };

  // Get the current patent ID to display
  // Prioritize search query patent IDs, then custom entered IDs
  const idsToUse = patentIds.length > 0 ? patentIds : activePatentIds;
  const currentPatentId = idsToUse.length > 0 && currentPatentIndex < idsToUse.length 
    ? idsToUse[currentPatentIndex] 
    : '';
    
  // Display the patent viewing progress
  const viewingProgress = idsToUse.length > 0 
    ? `Viewing ${currentPatentIndex + 1} of ${idsToUse.length}` 
    : '';

  return (
    <div className="patent-figure-search" onClick={(e) => e.stopPropagation()}>
      <form 
        className="figure-search-form" 
        onSubmit={(e) => {
          e.preventDefault();
          handleViewFigures(e as any);
        }}
      >
        <div className="figure-search-controls">
          <input
            type="text"
            value={customPatentId}
            onChange={handleCustomPatentIdChange}
            placeholder="Enter patent IDs separated by commas or spaces"
            className="patent-figure-input"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            type="submit"
            className="view-figures-button"
            onClick={handleViewFigures}
            disabled={!patentIds.length && !activePatentIds.length}
          >
            View Figures
          </button>
        </div>
      </form>
      
      {activePatentIds.length > 1 && (
        <div className="patent-ids-preview">
          {activePatentIds.map((id, index) => (
            <div 
              key={index} 
              className={`patent-id-tag ${currentPatentIndex === index && showFigureViewer ? 'active' : ''}`}
            >
              {id}
            </div>
          ))}
        </div>
      )}
      
      {viewingProgress && showFigureViewer && (
        <div className="viewing-progress">
          {viewingProgress}
        </div>
      )}
      
      {/* The figure viewer should have the highest z-index to ensure it's above all other content */}
      {showFigureViewer && currentPatentId && (
        <div className="figure-viewer-wrapper">
          <FigureViewer
            patentId={currentPatentId}
            onClose={closeFigureViewer}
            onNextRequested={handleNextPatent}
            patentIndex={currentPatentIndex + 1}
            totalPatents={idsToUse.length}
          />
        </div>
      )}
    </div>
  );
};

export default PatentFigureSearch; 