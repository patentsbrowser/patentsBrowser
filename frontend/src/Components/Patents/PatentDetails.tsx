import Claims from './Claims';
import Description from './Description';
import Figures from './Figures';
// import FamilyMembers from './FamilyMembers';
import PatentHighlighter from './PatentHighlighter';
import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { fetchFullPatentDetails } from '../../Redux/slices/patentSlice';
import './PatentDetails.scss';
import { ApiSource } from '../../api/patents';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faCog } from '@fortawesome/free-solid-svg-icons';
// import { formatPatentId } from '../Patents/utils';

interface PatentDetailsProps {
  title: string;
  abstract: string;
  claims: any[];
  description: string;
  figures: any[];
  familyMembers: any[];
  patentId: string;
  onPatentSelect: (patentId: string) => void;
  apiSource?: ApiSource;
  initialFetch?: boolean; // Flag to indicate if the parent already triggered a fetch
}

// Create a wrapper component that doesn't show anything if not open
const ControlledPatentHighlighter: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetSelector: string;
}> = ({ isOpen, onClose, targetSelector }) => {
  // Always render PatentHighlighter but with isOpen set to false when closed
  // This ensures highlights are applied but the UI is not visible
  return (
    <PatentHighlighter 
      targetSelector={targetSelector} 
      isOpen={isOpen} // Pass the actual isOpen state
      onClose={onClose}
      data-location="patent-details" // Add a data attribute to identify this instance
    />
  );
};

const PatentDetails: React.FC<PatentDetailsProps> = ({
  title,
  abstract,
  claims,
  description,
  figures,
  familyMembers,
  patentId,
  onPatentSelect,
  apiSource = 'unified',
  initialFetch = false
}) => {
  const dispatch = useAppDispatch();
  const { selectedPatent, isLoading, error } = useAppSelector((state) => state.patents);
  const hasFetchedRef = useRef(initialFetch);
  const [localFetchStatus, setLocalFetchStatus] = useState<'idle' | 'fetching' | 'done'>('idle');
  
  // Initialize highlighter state from localStorage to stay in sync with other components
  const [isHighlighterOpen, setIsHighlighterOpen] = useState(() => {
    // Get from localStorage if available, but open by default only if terms exist
    try {
      const savedState = localStorage.getItem('patentHighlighterOpen');
      const hasHighlightTerms = localStorage.getItem('patent_highlighter_terms') && 
                               JSON.parse(localStorage.getItem('patent_highlighter_terms') || '[]').length > 0;
      const hasProximityTerms = localStorage.getItem('patent_highlighter_proximity') && 
                               JSON.parse(localStorage.getItem('patent_highlighter_proximity') || '[]').length > 0;
      const hasFormulaTerms = localStorage.getItem('patent_highlighter_formulas') && 
                             JSON.parse(localStorage.getItem('patent_highlighter_formulas') || '[]').length > 0;
      
      // Return the saved state, or open by default if any terms exist
      return savedState ? JSON.parse(savedState) : (hasHighlightTerms || hasProximityTerms || hasFormulaTerms);
    } catch (e) {
      console.error('Error loading highlighter state:', e);
      return false;
    }
  });

  // Sync highlighter state with localStorage
  useEffect(() => {
    localStorage.setItem('patentHighlighterOpen', JSON.stringify(isHighlighterOpen));
  }, [isHighlighterOpen]);

  // Add a check for invalid patent IDs
  const canFetchDetails = patentId && patentId.length > 3;
  
  useEffect(() => {
    // Reset local fetch status when patent ID changes
    if (patentId) {
      setLocalFetchStatus('idle');
      hasFetchedRef.current = initialFetch;
    }
  }, [patentId, initialFetch]);

  useEffect(() => {
    const shouldFetch = 
      apiSource === 'unified' && 
      canFetchDetails &&
      localFetchStatus === 'idle' &&
      !hasFetchedRef.current &&
      (!claims?.length || !description || !figures?.length) &&
      !isHighlighterOpen; // Don't fetch when highlighter is open

    if (shouldFetch) {
      console.log('Fetching additional patent details for Unified API patent:', patentId);
      setLocalFetchStatus('fetching');
      hasFetchedRef.current = true;
      
      dispatch(fetchFullPatentDetails({ patentId, apiType: apiSource }))
        .catch(error => {
          console.error('Error fetching patent details:', error);
          setLocalFetchStatus('idle');
        });
    }
  }, [patentId, dispatch, apiSource, localFetchStatus, claims, description, figures, isHighlighterOpen, canFetchDetails]);

  // Update local fetch status when data is received
  useEffect(() => {
    if (selectedPatent?.description && selectedPatent?.claims && selectedPatent?.figures) {
      setLocalFetchStatus('done');
    }
  }, [selectedPatent]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      setLocalFetchStatus('idle');
      hasFetchedRef.current = false;
    };
  }, []);

  if (isLoading && localFetchStatus === 'fetching' && apiSource === 'unified') {
    return <div className="loading">Loading patent details...</div>;
  }

  if (error && apiSource === 'unified') {
    return <div className="error">Error loading patent details: {error}</div>;
  }

  // Use the data from Redux store if available (for Unified API), otherwise fall back to props (for SerpAPI)
  const patentData = (apiSource === 'unified' && selectedPatent) ? selectedPatent : {
    claims,
    description,
    figures,
  };

  console.log('Patent data being used in details:', {
    apiSource,
    usingProps: patentData === selectedPatent ? false : true,
    figures: patentData.figures
  });

  // Count the number of figures properly
  let figuresCount = 0;
  if (patentData.figures) {
    if (Array.isArray(patentData.figures)) {
      figuresCount = patentData.figures.length;
    } else if (
      typeof patentData.figures === 'object' && 
      patentData.figures !== null && 
      'figures' in patentData.figures && 
      Array.isArray((patentData.figures as any).figures)
    ) {
      figuresCount = (patentData.figures as any).figures.length;
    }
  }

  return (
    <div className="patent-details">
      <div className="patent-header">
        <h3>{title}</h3>
        <div className="header-actions">
          {/* Settings button removed - use the one in PatentSummaryList instead */}
        </div>
        <ControlledPatentHighlighter 
          isOpen={isHighlighterOpen}
          onClose={() => setIsHighlighterOpen(!isHighlighterOpen)}
          targetSelector=".highlightable"
        />
      </div>
      
      <div className="patent-details-layout">
        <div className="patent-details-main">
          <div className="patent-details-content-scroll">
            <div className="details-section">
              <h4>Abstract</h4>
              <p className="highlightable">{abstract || 'No abstract data found'}</p>
            </div>

            {localFetchStatus === 'fetching' ? (
              <div className="section-loading">Loading claims data...</div>
            ) : (
              <Claims 
                initialClaims={patentData.claims || []} 
                patentId={patentId} 
                noDataMessage="No claims data found for this patent"
              />
            )}

            {localFetchStatus === 'fetching' ? (
              <div className="section-loading">Loading description data...</div>
            ) : (
              <Description 
                initialDescription={patentData.description || ''} 
                patentId={patentId}
                noDataMessage="No description data found for this patent" 
              />
            )}
          </div>
        </div>
        
        <div className="patent-details-figures">
          <div className="figures-title">
            <h4>Figures ({figuresCount})</h4>
          </div>
          
          {localFetchStatus === 'fetching' ? (
            <div className="section-loading">Loading figures data...</div>
          ) : (
            <Figures 
              initialFigures={patentData.figures || []}
              noDataMessage="No figures data found for this patent"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PatentDetails; 