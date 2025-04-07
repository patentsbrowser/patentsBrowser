import Claims from './Claims';
import Description from './Description';
import Figures from './Figures';
import FamilyMembers from './FamilyMembers';
import PatentHighlighter from './PatentHighlighter';
import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { fetchFullPatentDetails } from '../../Redux/slices/patentSlice';
import './PatentDetails.scss';
import { ApiSource } from '../../api/patents';
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
      patentId && 
      localFetchStatus === 'idle' &&
      !hasFetchedRef.current &&
      (!selectedPatent?.description || 
       !selectedPatent?.claims || 
       !selectedPatent?.figures);

    if (shouldFetch) {
      console.log('Fetching additional patent details for Unified API patent:', patentId);
      setLocalFetchStatus('fetching');
      hasFetchedRef.current = true;
      
      // For Unified API, ensure the patent ID is in the correct format (XX-NNNNNN-YY)
      // If it's not already in the correct format with hyphens, assume it's already formatted correctly
      // since it should be formatted by the parent component
      dispatch(fetchFullPatentDetails({ patentId, apiType: apiSource }));
    }
  }, [patentId, selectedPatent, dispatch, apiSource, localFetchStatus]);

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
      <h3>{title}</h3>
      
      <div className="patent-details-layout">
        <div className="patent-details-main">
          <PatentHighlighter targetSelector=".highlightable" />

          <div className="patent-details-content-scroll">
            <div className="details-section">
              <h4>Abstract</h4>
              <p className="highlightable">{abstract}</p>
            </div>

            <Claims 
              initialClaims={patentData.claims || []} 
              patentId={patentId} 
            />

            <Description 
              initialDescription={patentData.description || ''} 
              patentId={patentId} 
            />
            
            {familyMembers && familyMembers.length > 0 && (
              <FamilyMembers 
                familyMembers={familyMembers} 
                onPatentSelect={onPatentSelect}
              />
            )}
          </div>
        </div>
        
        <div className="patent-details-figures">
          <div className="figures-title">
            <h4>Figures ({figuresCount})</h4>
          </div>
          
          <Figures 
            initialFigures={patentData.figures || []} 
          />
        </div>
      </div>
    </div>
  );
};

export default PatentDetails; 