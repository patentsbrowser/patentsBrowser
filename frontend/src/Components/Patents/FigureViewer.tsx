import React, { useState, useEffect } from 'react';
import { patentApi } from '../../api/patents';
import Loader from '../Common/Loader';
import './Figures.scss';
import './FigureViewer.scss';

interface Figure {
  path?: string;
  imgStr?: string;
  title?: string;
}

interface FigureViewerProps {
  patentId: string;
  onClose: () => void;
  onNextRequested: () => void;
  patentIndex?: number;
  totalPatents?: number;
}

const FigureViewer: React.FC<FigureViewerProps> = ({ 
  patentId, 
  onClose, 
  onNextRequested,
  patentIndex = 1,
  totalPatents = 1
}) => {
  const [figuresArray, setFiguresArray] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Figure | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [rotation, setRotation] = useState(0);
  const [allFiguresViewed, setAllFiguresViewed] = useState(false);
  const [viewedFigures, setViewedFigures] = useState<Set<number>>(new Set());

  // Add class to body when component mounts, remove when unmounts
  useEffect(() => {
    document.body.classList.add('figure-viewer-open');
    return () => {
      document.body.classList.remove('figure-viewer-open');
    };
  }, []);

  useEffect(() => {
    const fetchFigures = async () => {
      setIsLoading(true);
      setError(null);
      setAllFiguresViewed(false);
      setViewedFigures(new Set());
      
      try {
        const response = await patentApi.getFigures(patentId);
        // Extract figures from the response
        let figures: Figure[] = [];
        if (response && response.figures && Array.isArray(response.figures)) {
          figures = response.figures;
        } else if (Array.isArray(response)) {
          figures = response;
        }
        
        setFiguresArray(figures);
        
        // Select the first image by default if available
        if (figures.length > 0) {
          setSelectedImage(figures[0]);
          setSelectedIndex(0);
          // Mark first figure as viewed
          setViewedFigures(new Set([0]));
        }
      } catch (err) {
        console.error('Error fetching figures:', err);
        setError('Failed to load figures for this patent');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (patentId) {
      fetchFigures();
    }
  }, [patentId]);

  // Check if all figures have been viewed
  useEffect(() => {
    if (figuresArray.length > 0 && viewedFigures.size === figuresArray.length) {
      setAllFiguresViewed(true);
    }
  }, [viewedFigures, figuresArray.length]);

  const getImageSource = (figure: Figure) => {
    if (figure.imgStr) {
      // If image is in base64 format
      return `data:image/png;base64,${figure.imgStr}`;
    }
    // If image is a URL
    return figure.path || '';
  };

  const handleImageClick = (e: React.MouseEvent, figure: Figure, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(figure);
    setSelectedIndex(index);
    setRotation(0); // Reset rotation when opening a new image
    
    // Mark this figure as viewed
    setViewedFigures(prev => new Set([...prev, index]));
  };

  const navigateToImage = (e: React.MouseEvent, direction: 'prev' | 'next') => {
    e.preventDefault();
    e.stopPropagation();
    if (figuresArray.length <= 1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (selectedIndex + 1) % figuresArray.length;
    } else {
      newIndex = (selectedIndex - 1 + figuresArray.length) % figuresArray.length;
    }
    
    setSelectedImage(figuresArray[newIndex]);
    setSelectedIndex(newIndex);
    setRotation(0); // Reset rotation on navigation
    
    // Mark this figure as viewed
    setViewedFigures(prev => new Set([...prev, newIndex]));
  };

  const rotateImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  const handleNextPatent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNextRequested();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedImage) return;
      
      switch(event.key) {
        case 'Escape':
          onClose();
          break;
        case 'r':
        case 'R':
          rotateImage(event as any);
          break;
        case 'ArrowLeft':
          navigateToImage(event as any, 'prev');
          break;
        case 'ArrowRight':
          navigateToImage(event as any, 'next');
          break;
        case 'n':
        case 'N':
          if (allFiguresViewed) {
            handleNextPatent(event as any);
          } else {
            navigateToImage(event as any, 'next');
          }
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage, selectedIndex, figuresArray.length, allFiguresViewed]);

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (isLoading) {
    return (
      <div className="figure-viewer-container" onClick={stopPropagation}>
        <div className="loading-container">
          <Loader text={`Loading figures for patent ${patentId}...`} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="figure-viewer-container" onClick={stopPropagation}>
        <div className="error-message">
          <p>{error}</p>
          <div className="figure-viewer-actions">
            <button className="primary-button" onClick={handleClose}>Close</button>
            {totalPatents > 1 && patentIndex < totalPatents && (
              <button className="secondary-button" onClick={handleNextPatent}>Continue to Next Patent</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!figuresArray || figuresArray.length === 0) {
    return (
      <div className="figure-viewer-container" onClick={stopPropagation}>
        <div className="no-figures-message">
          <h3>No Figures Available</h3>
          <p>No figures were found for patent ID: {patentId}</p>
          <div className="figure-viewer-actions">
            <button className="primary-button" onClick={handleClose}>Close</button>
            {totalPatents > 1 && patentIndex < totalPatents && (
              <button className="secondary-button" onClick={handleNextPatent}>Continue to Next Patent</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="figure-viewer-container" onClick={stopPropagation}>
      <div className="figure-viewer-header">
        <div className="header-info">
          <h3>Patent {patentId}</h3>
          <span className="patent-progress">Patent {patentIndex} of {totalPatents}</span>
        </div>
        <div className="header-actions">
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
      </div>
      
      <div className="figure-viewer-content">
        {/* Main image view */}
        {selectedImage && (
          <div className="selected-figure-view">
            <div className="selected-figure-container">
              <div className={`modal-image-container rotation-${rotation}`}>
                <img 
                  src={getImageSource(selectedImage)} 
                  alt={selectedImage.title || 'Figure'} 
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>
              
              <div className="image-controls">
                <button className="rotate-button" onClick={rotateImage} title="Rotate image">
                  Rotate
                </button>
                {figuresArray.length > 1 && (
                  <>
                    <button 
                      className="nav-button prev-button" 
                      onClick={(e) => navigateToImage(e, 'prev')}
                      title="Previous figure"
                    >
                      Previous
                    </button>
                    <button 
                      className="nav-button next-button" 
                      onClick={(e) => navigateToImage(e, 'next')}
                      title="Next figure"
                    >
                      Next
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Thumbnails on the right side */}
        <div className="figures-grid-container">
          <div className="figures-grid">
            {figuresArray.map((figure: Figure, index: number) => (
              <div 
                key={index} 
                className={`figure-item ${selectedIndex === index ? 'selected' : ''} ${viewedFigures.has(index) ? 'viewed' : ''}`}
                onClick={(e) => handleImageClick(e, figure, index)}
              >
                {viewedFigures.has(index) && <div className="viewed-checkmark">✓</div>}
                <img 
                  src={getImageSource(figure)}
                  alt={figure.title || `Figure ${index + 1}`}
                  loading="lazy"
                />
                <p>Figure {index + 1} of {figuresArray.length}</p>
              </div>
            ))}
          </div>
          {figuresArray.length > 5 && <div className="scroll-indicator">Scroll for more</div>}
        </div>
      </div>
      
      <div className="figure-viewer-footer">
        <div className="figure-counter-info">
          <span>Figure {selectedIndex + 1} of {figuresArray.length}</span>
          <span className="viewed-count">{viewedFigures.size} viewed</span>
        </div>
        
        {allFiguresViewed || figuresArray.length <= 1 ? (
          <div className="all-figures-viewed">
            <span className="viewed-indicator">✓ All figures viewed</span>
            {totalPatents > 1 && patentIndex < totalPatents && (
              <button className="primary-button" onClick={handleNextPatent}>
                Next Patent
              </button>
            )}
          </div>
        ) : null}
        
        <div className="keyboard-shortcuts">
          <span>Shortcuts: ← → (navigate), R (rotate), ESC (close)</span>
        </div>
        
        <button className="secondary-button close-button" onClick={handleClose}>Close</button>
      </div>
    </div>
  );
};

export default FigureViewer; 