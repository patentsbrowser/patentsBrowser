import { useState, useEffect } from 'react';
import './Figures.scss';

interface Figure {
  path?: string;
  imgStr?: string;
  title?: string;
}

interface FiguresProps {
  initialFigures: { figures?: Figure[] } | Figure[];
  noDataMessage?: string;
}

const Figures = ({ initialFigures, noDataMessage = "No figures available for this patent" }: FiguresProps) => {
  const [selectedImage, setSelectedImage] = useState<Figure | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [rotation, setRotation] = useState(0);
  const [navStyle, setNavStyle] = useState<'arrows' | 'buttons'>('arrows');
  const [imageLoaded, setImageLoaded] = useState(false);

  // Extract figures array from potentially nested structure
  let figuresArray: Figure[] = [];
  
  if (Array.isArray(initialFigures)) {
    // If directly passed as array
    figuresArray = initialFigures;
  } else if (initialFigures && 'figures' in initialFigures && Array.isArray(initialFigures.figures)) {
    // If passed as { figures: Array }
    figuresArray = initialFigures.figures;
  }

  const getImageSource = (figure: Figure) => {
    if (figure.imgStr) {
      // If image is in base64 format
      return `data:image/png;base64,${figure.imgStr}`;
    }
    // If image is a URL
    return figure.path || '';
  };

  const handleImageClick = (figure: Figure, index: number) => {
    setSelectedImage(figure);
    setSelectedIndex(index);
    setRotation(0); // Reset rotation when opening a new image
    setImageLoaded(false); // Reset image loaded state
  };

  const closeFullscreen = () => {
    setSelectedImage(null);
    setSelectedIndex(-1);
    setRotation(0); // Reset rotation when closing
  };
  
  const rotateImage = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };
  
  const navigateToImage = (direction: 'prev' | 'next') => {
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
    setImageLoaded(false); // Reset image loaded state
  };
  
  const toggleNavigationStyle = () => {
    setNavStyle(prev => prev === 'arrows' ? 'buttons' : 'arrows');
  };
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedImage) return;
      
      switch(event.key) {
        case 'Escape':
          closeFullscreen();
          break;
        case 'r':
        case 'R':
          rotateImage();
          break;
        case 'ArrowLeft':
          navigateToImage('prev');
          break;
        case 'ArrowRight':
          navigateToImage('next');
          break;
        case 'n':
          toggleNavigationStyle();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage, selectedIndex, figuresArray.length]);

  // Handle image loading
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Add function to determine image orientation class
  const getOrientationClass = () => {
    return rotation === 90 || rotation === 270 ? 'rotated-vertical' : 'rotated-horizontal';
  };

  if (!figuresArray || figuresArray.length === 0) {
    return (
      <div className="section-content figures-content">
        <div className="no-data-message">
          <p>{noDataMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-content figures-content">
      <div className="figures-grid">
        {figuresArray.map((figure: Figure, index: number) => (
          <div key={index} className="figure-item">
            <img 
              src={getImageSource(figure)}
              alt={figure.title || `Figure ${index + 1}`}
              loading="lazy"
              onClick={() => handleImageClick(figure, index)}
            />
            <p>Figure {index + 1} of {figuresArray.length}: {figure.title || ''}</p>
          </div>
        ))}
      </div>

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div className="fullscreen-modal" onClick={closeFullscreen}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            data-rotation={rotation}
          >
            <button className="close-button" onClick={closeFullscreen}>×</button>
            
            {/* Navigation Style 1: Side Arrows */}
            {navStyle === 'arrows' && figuresArray.length > 1 && (
              <>
                <button 
                  className="nav-arrow nav-prev" 
                  onClick={() => navigateToImage('prev')}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button 
                  className="nav-arrow nav-next" 
                  onClick={() => navigateToImage('next')}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
            
            <div className={`modal-image-container rotation-${rotation}`}>
              <img 
                src={getImageSource(selectedImage)} 
                alt={selectedImage.title || 'Figure'} 
                style={{ transform: `rotate(${rotation}deg)` }}
                onLoad={handleImageLoad}
                className={imageLoaded ? 'image-loaded' : 'image-loading'}
              />
            </div>
            
            <p className="modal-title">
              Figure {selectedIndex + 1} of {figuresArray.length}
              {selectedImage.title ? `: ${selectedImage.title}` : ''}
            </p>
            
            <div className="modal-controls">
              {/* Navigation Style 2: Buttons */}
              {navStyle === 'buttons' && figuresArray.length > 1 && (
                <>
                  <button 
                    className="nav-button prev-button" 
                    onClick={() => navigateToImage('prev')}
                    title="Previous image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    Prev
                  </button>
                  <span className="image-counter">{selectedIndex + 1}/{figuresArray.length}</span>
                  <button 
                    className="nav-button next-button" 
                    onClick={() => navigateToImage('next')}
                    title="Next image"
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                </>
              )}
              
              <button className="rotate-button" onClick={rotateImage} title="Rotate image">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                Rotate
              </button>
              
              <button 
                className="toggle-nav-button" 
                onClick={toggleNavigationStyle}
                title="Toggle navigation style"
              >
                {navStyle === 'arrows' ? 'Use Buttons' : 'Use Arrows'}
              </button>
            </div>
            
            <div className="keyboard-hint">
              Press ESC to close, R to rotate, ← → to navigate, N to change navigation style
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Figures; 