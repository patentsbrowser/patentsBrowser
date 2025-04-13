import React, { useState } from 'react';
import FigureViewer from './FigureViewer';
import './PatentFigureSearch.scss';

interface PatentFigureSearchProps {
  patentIds: string[];
}

const PatentFigureSearch: React.FC<PatentFigureSearchProps> = ({ patentIds }) => {
  const [showFigureViewer, setShowFigureViewer] = useState(false);
  const [currentPatentIndex, setCurrentPatentIndex] = useState(0);
  
  const handleViewFigures = (e: React.MouseEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();
    e.stopPropagation();
    
    if (patentIds.length > 0) {
      // Use search query patent IDs
      setCurrentPatentIndex(0);
      setShowFigureViewer(true);
    } else {
      alert('Please enter a patent ID in the search field above');
    }
  };

  const handleNextPatent = () => {
    if (patentIds.length > 0) {
      // Move to the next patent in the sequence
      const nextIndex = currentPatentIndex + 1;
      
      if (nextIndex < patentIds.length) {
        setCurrentPatentIndex(nextIndex);
        console.log(`Moving to next patent: ${patentIds[nextIndex]} (${nextIndex + 1}/${patentIds.length})`);
      } else {
        // We've reached the end of the patent list
        console.log('Reached the end of patent list, closing viewer');
        setShowFigureViewer(false);
        // Optional: Show a toast or message indicating completion
      }
    } else {
      // If there are no patent IDs, just close the viewer
      setShowFigureViewer(false);
    }
  };

  const closeFigureViewer = () => {
    setShowFigureViewer(false);
  };

  // Get the current patent ID to display
  const currentPatentId = patentIds.length > 0 && currentPatentIndex < patentIds.length 
    ? patentIds[currentPatentIndex] 
    : '';
    
  // Display the patent viewing progress
  const viewingProgress = patentIds.length > 0 
    ? `Viewing ${currentPatentIndex + 1} of ${patentIds.length}` 
    : '';

  return (
    <div className="patent-figure-search" onClick={(e) => e.stopPropagation()}>
      <div className="figure-search-controls">
        <button 
          type="button"
          className="view-figures-button"
          onClick={handleViewFigures}
          disabled={!patentIds.length}
        >
          View Figures
        </button>
      </div>
      
      {patentIds.length > 1 && (
        <div className="patent-ids-preview">
          {patentIds.map((id, index) => (
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
            totalPatents={patentIds.length}
          />
        </div>
      )}
    </div>
  );
};

export default PatentFigureSearch; 