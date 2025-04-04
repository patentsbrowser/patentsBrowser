import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner, faArrowLeft, faTimes } from '@fortawesome/free-solid-svg-icons';
import { patentApi } from '../../api/patents';
import { standardizePatentNumber, getPatentCountry, isUSPatent } from '../../utils/patentUtils';
import './FamilySearchModal.scss';

interface FamilyMember {
  publication_number: string;
  publication_date: string;
  kind_code: string;
  country_code?: string; // Extracted from publication_number
  sourcePatentId?: string; // Track which patent this member came from
}

interface PatentInfo {
  patentId: string;
  title: string;
  country: string;
  familyMembers: FamilyMember[];
}

interface FamilySearchModalProps {
  patentId: string | string[]; // Can now be a single ID or array of IDs
  onClose: () => void;
  onPatentSelect: (patentId: string) => void;
}

const FamilySearchModal: React.FC<FamilySearchModalProps> = ({ 
  patentId, 
  onClose, 
  onPatentSelect 
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [patentInfos, setPatentInfos] = useState<PatentInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'us' | 'all'>('us');
  
  // Convert patentId to array if it's a string
  const patentIds = Array.isArray(patentId) ? patentId : [patentId];

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const patentInfoResults: PatentInfo[] = [];
        
        // Process each patent ID sequentially
        for (const pid of patentIds) {
          try {
            // Get the standardized patent ID format
            const standardizedId = standardizePatentNumber(pid);
            
            // Fetch patent details including family members
            const response = await patentApi.searchPatentsUnified(standardizedId);
            
            if (!response || !response._source) {
              console.error(`Invalid response from API for patent ${pid}`);
              continue; // Skip this patent but continue with others
            }
            
            // Process family members
            const members = response._source.family_members || [];
            
            // Add country code and source patent ID to each family member
            const processedMembers = members.map(member => {
              const standardized = standardizePatentNumber(member.publication_number);
              const country = getPatentCountry(standardized);
              return {
                ...member,
                country_code: country,
                sourcePatentId: pid
              };
            });
            
            // Add to patent infos array
            patentInfoResults.push({
              patentId: pid,
              title: response._source.title || 'Unknown Patent',
              country: getPatentCountry(standardizedId) || 'Unknown',
              familyMembers: processedMembers
            });
          } catch (err) {
            console.error(`Error fetching family members for patent ${pid}:`, err);
            // Add error entry but continue with other patents
            patentInfoResults.push({
              patentId: pid,
              title: 'Error Loading Patent',
              country: 'Unknown',
              familyMembers: []
            });
          }
        }
        
        setPatentInfos(patentInfoResults);
      } catch (err) {
        console.error('Error in family search process:', err);
        setError('Failed to fetch patent family members. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFamilyMembers();
  }, [patentIds]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid date
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString; // Return original string if error occurs
    }
  };

  const handlePatentSelect = (publicationNumber: string) => {
    onPatentSelect(publicationNumber);
    onClose();
  };
  
  // Get combined family members from all patents
  const getAllFamilyMembers = () => {
    return patentInfos.flatMap(info => info.familyMembers);
  };
  
  // Filter family members based on search mode
  const filteredMembers = searchMode === 'us' 
    ? getAllFamilyMembers().filter(member => member.country_code === 'US')
    : getAllFamilyMembers();

  return (
    <div className="family-search-modal-overlay">
      <div className="family-search-modal">
        <div className="family-search-modal-header">
          <button className="close-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
          <h2>Patent Family Search {patentInfos.length > 1 ? `(${patentInfos.length} Patents)` : ''}</h2>
          
          {patentInfos.length > 0 && (
            <div className="original-patents-info">
              {patentInfos.map((info, index) => (
                <div className="original-patent-info" key={index}>
                  <p><strong>Patent {index + 1}:</strong> {info.patentId}</p>
                  <p><strong>Country:</strong> {info.country}</p>
                  <p><strong>Title:</strong> {info.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="search-options">
          <div className="search-mode-selector">
            <button 
              className={`search-mode-button ${searchMode === 'us' ? 'active' : ''}`}
              onClick={() => setSearchMode('us')}
            >
              US Patents Only
            </button>
            <button 
              className={`search-mode-button ${searchMode === 'all' ? 'active' : ''}`}
              onClick={() => setSearchMode('all')}
            >
              All Countries
            </button>
          </div>
        </div>

        <div className="family-members-container">
          {isLoading ? (
            <div className="loading-container">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading patent family members...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          ) : (
            <>
              <div className="results-header">
                <h3>
                  {searchMode === 'us' ? 'US Family Members' : 'All Family Members'} 
                  ({filteredMembers.length})
                </h3>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="no-results-message">
                  {searchMode === 'us' 
                    ? 'No US family members found for these patents.' 
                    : 'No family members found for these patents.'}
                </div>
              ) : (
                <div className="family-members-list">
                  {patentInfos.length > 1 && filteredMembers.length > 0 && (
                    <div className="family-members-group-header">
                      Family members from all searched patents
                    </div>
                  )}
                  
                  {filteredMembers.map((member, index) => {
                    // Find the source patent info for this member
                    const sourcePatent = patentInfos.find(p => p.patentId === member.sourcePatentId);
                    
                    return (
                      <div key={index} className="family-member-item">
                        <div className="member-country">{member.country_code}</div>
                        <div 
                          className="member-number clickable"
                          onClick={() => handlePatentSelect(member.publication_number)}
                        >
                          {member.publication_number}
                          {patentInfos.length > 1 && (
                            <span className="source-patent">
                              (from {sourcePatent?.patentId || 'unknown'})
                            </span>
                          )}
                        </div>
                        <div className="member-date">{formatDate(member.publication_date)}</div>
                        <div className="member-kind">{member.kind_code}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilySearchModal; 