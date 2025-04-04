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
}

interface FamilySearchModalProps {
  patentId: string;
  onClose: () => void;
  onPatentSelect: (patentId: string) => void;
}

const FamilySearchModal: React.FC<FamilySearchModalProps> = ({ 
  patentId, 
  onClose, 
  onPatentSelect 
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'us' | 'all'>('us');
  const [originalPatentInfo, setOriginalPatentInfo] = useState<{
    title: string;
    country: string;
  } | null>(null);

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the standardized patent ID format
        const standardizedId = standardizePatentNumber(patentId);
        
        // Fetch patent details including family members
        const response = await patentApi.searchPatentsUnified(standardizedId);
        
        if (!response || !response._source) {
          throw new Error('Invalid response from API');
        }
        
        // Extract original patent info
        setOriginalPatentInfo({
          title: response._source.title || 'Unknown Patent',
          country: getPatentCountry(standardizedId) || 'Unknown',
        });
        
        // Process family members
        const members = response._source.family_members || [];
        
        // Add country code to each family member
        const processedMembers = members.map(member => {
          const standardized = standardizePatentNumber(member.publication_number);
          const country = getPatentCountry(standardized);
          return {
            ...member,
            country_code: country
          };
        });
        
        setFamilyMembers(processedMembers);
      } catch (err) {
        console.error('Error fetching family members:', err);
        setError('Failed to fetch patent family members. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFamilyMembers();
  }, [patentId]);

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

  const filteredMembers = searchMode === 'us' 
    ? familyMembers.filter(member => member.country_code === 'US')
    : familyMembers;

  return (
    <div className="family-search-modal-overlay">
      <div className="family-search-modal">
        <div className="family-search-modal-header">
          <button className="close-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
          <h2>Patent Family Search</h2>
          {originalPatentInfo && (
            <div className="original-patent-info">
              <p><strong>Original Patent:</strong> {patentId}</p>
              <p><strong>Country:</strong> {originalPatentInfo.country}</p>
              <p><strong>Title:</strong> {originalPatentInfo.title}</p>
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
                    ? 'No US family members found for this patent.' 
                    : 'No family members found for this patent.'}
                </div>
              ) : (
                <div className="family-members-list">
                  {filteredMembers.map((member, index) => (
                    <div key={index} className="family-member-item">
                      <div className="member-country">{member.country_code}</div>
                      <div 
                        className="member-number clickable"
                        onClick={() => handlePatentSelect(member.publication_number)}
                      >
                        {member.publication_number}
                      </div>
                      <div className="member-date">{formatDate(member.publication_date)}</div>
                      <div className="member-kind">{member.kind_code}</div>
                    </div>
                  ))}
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