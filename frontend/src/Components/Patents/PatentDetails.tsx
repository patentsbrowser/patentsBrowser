import Claims from './Claims';
import Description from './Description';
import Figures from './Figures';
import FamilyMembers from './FamilyMembers';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { fetchFullPatentDetails } from '../../Redux/slices/patentSlice';
import './PatentDetails.scss';
import { ApiSource } from '../../api/patents';

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
  apiSource = 'unified'
}) => {
  const [showFigures, setShowFigures] = useState(true); // Default to show figures
  const dispatch = useAppDispatch();
  const { selectedPatent, isLoading, error } = useAppSelector((state) => state.patents);

  useEffect(() => {
    // Only fetch additional data if we're using Unified API and don't have all the required data
    // For SerpAPI, we'll use the data that was passed in via props
    if (apiSource === 'unified' && 
        patentId && 
        (!selectedPatent || 
        selectedPatent.patentId !== patentId || 
        !selectedPatent.description || 
        !selectedPatent.claims || 
        !selectedPatent.figures)) {
      
      console.log('Fetching additional patent details for Unified API patent:', patentId);
      dispatch(fetchFullPatentDetails(patentId));
    } else {
      console.log('Using existing data for patent details, skipping API calls');
    }
  }, [patentId, selectedPatent, dispatch, apiSource]);

  if (isLoading && !selectedPatent && apiSource === 'unified') {
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

  return (
    <div className="patent-details">
      <h3>{title}</h3>
      
      <div className="patent-details-layout">
        <div className="patent-details-content">
          <div className="details-section">
            <h4>Abstract</h4>
            <p>{abstract}</p>
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
        
        <div className="patent-details-figures">
          <div className="details-section figures-section">
            <div className="section-title">
              <h4>Figures ({patentData.figures?.length || 0})</h4>
            </div>
            
            <Figures 
              initialFigures={patentData.figures || []} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatentDetails; 