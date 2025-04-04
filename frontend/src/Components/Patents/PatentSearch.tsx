import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { RootState } from '../../Redux/store';
import { fetchFullPatentDetails } from '../../Redux/slices/patentSlice';
import './PatentSearch.scss';
// import PatentDetails from './PatentDetails';
import Loader from '../Common/Loader';
import SmartSearchModal from './SmartSearchModal';
import PatentSearchForm from './PatentSearchForm';
import PatentSummaryList from './PatentSummaryList';
import { detectApiType, formatDate } from './utils';
import { PatentSummary } from './types';
import { ApiSource, patentApi, normalizePatentResponse } from '../../api/patents';
import FamilySearchModal from './FamilySearchModal';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
// import PatentSummaryList from './PatentSummaryList';
// import { PatentSummary, ApiSource } from './types';
// import { formatDate, detectApiType } from './utils';

interface PatentSearchProps {
  onSearch: (patentIds: string[]) => void;
  initialPatentId?: string;
}

const PatentSearch: React.FC<PatentSearchProps> = ({ onSearch, initialPatentId = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patentIds, setPatentIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApi, setSelectedApi] = useState<ApiSource>('unified');
  const [searchType, setSearchType] = useState<'full' | 'smart'>('full');
  const [showSmartSearchModal, setShowSmartSearchModal] = useState(false);
  const [patentSummaries, setPatentSummaries] = useState<PatentSummary[]>([]);
  const [selectedPatent, setSelectedPatent] = useState<PatentSummary | null>(null);
  const [showFamilySearchModal, setShowFamilySearchModal] = useState(false);
  
  const dispatch = useAppDispatch();
  const patentsState = useAppSelector((state: RootState) => state.patents);

  // Add this effect to update searchQuery when initialPatentId changes
  useEffect(() => {
    if (initialPatentId) {
      setSearchQuery(initialPatentId);
      
      // Process for multiple patent IDs
      const ids = initialPatentId
        .split(/[\s,]+/)
        .map(id => id.trim())
        .filter(id => id);
      
      if (ids.length > 0) {
        setPatentIds(ids);
        
        // Auto-detect API type from the first patent ID
        const apiType = detectApiType(ids[0]);
        setSelectedApi(apiType);
      }
    }
  }, [initialPatentId]);
  
  // Add this to provide the populate callback
  useEffect(() => {
    window.patentSearchPopulateCallback = (patentId: string) => {
      setSearchQuery(patentId);
      
      // Process for multiple patent IDs
      const ids = patentId
        .split(/[\s,]+/)
        .map(id => id.trim())
        .filter(id => id);
      
      if (ids.length > 0) {
        setPatentIds(ids);
        
        // Auto-detect API type from the first patent ID
        const apiType = detectApiType(ids[0]);
        setSelectedApi(apiType);
      }
    };
    
    return () => {
      window.patentSearchPopulateCallback = undefined;
    };
  }, []);

  // Format patent ID based on selected API
  const formatPatentId = (patentId: string, apiType: ApiSource): string => {
    // Remove any existing hyphens and special characters for SerpAPI
    if (apiType === 'serpapi') {
      return patentId.replace(/[-]/g, '');
    }
    
    // For unified format: try to convert to format like US-8125463-B2
    if (apiType === 'unified') {
      // First check if it's already in the correct format (XX-######-X#)
      if (/^[A-Z]{2}-\d+-[A-Z]\d$/i.test(patentId)) {
        return patentId;
      }
      
      // Remove any existing hyphens or spaces
      let cleanId = patentId.replace(/[-\s]/g, '');
      
      // Use regex to extract country code, number part, and kind code
      const match = cleanId.match(/^([A-Z]{2})(\d+)([A-Z]\d?)$/i);
      
      if (match) {
        const [, countryCode, numberPart, kindCode] = match;
        return `${countryCode.toUpperCase()}-${numberPart}-${kindCode.toUpperCase()}`;
      }
      
      // Fallback to old method if the regex doesn't match
      if (cleanId.length < 3) return patentId;
      
      const countryCode = cleanId.substring(0, 2).toUpperCase();
      
      // Check if we have a kind code at the end (usually a letter followed by optional number)
      const kindCodeMatch = cleanId.substring(2).match(/([A-Z]\d?)$/i);
      let numberPart, kindCode;
      
      if (kindCodeMatch) {
        // Find where the kind code starts
        const kindCodeIndex = cleanId.length - kindCodeMatch[0].length;
        numberPart = cleanId.substring(2, kindCodeIndex);
        kindCode = kindCodeMatch[0].toUpperCase();
      } else {
        // If no kind code is found, assume everything after country code is the number
        numberPart = cleanId.substring(2);
        kindCode = '';
      }
      
      return kindCode ? `${countryCode}-${numberPart}-${kindCode}` : `${countryCode}-${numberPart}`;
    }
    
    return patentId;
  };

  const handlePerformSearch = async (idsToSearch: string[]) => {
    const initialSummaries = idsToSearch.map(id => ({
      patentId: id,
      status: 'loading' as const,
    }));
    
    setPatentSummaries(initialSummaries);
    setIsSearching(true);
    setIsLoading(true);

    try {
      const searchResults = await handleSearch(idsToSearch, 'direct', selectedApi);
      setPatentSummaries(searchResults);
      onSearch(idsToSearch);
    } catch (error: any) {
      console.error('Search error:', error);
      setPatentSummaries([{
        patentId: idsToSearch[0],
        status: 'error' as const,
        error: error.message || 'An unexpected error occurred during search'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // This will be moved to a service file in a complete refactoring
  const handleSearch = async (
    idsToSearch: string[],
    searchType: 'direct' | 'smart',
    apiType: ApiSource
  ): Promise<PatentSummary[]> => {
    if (searchType === 'direct') {
      // For direct search, we'll query each patent ID individually
      const promises = idsToSearch.map(async (id) => {
        try {
          const formattedId = formatPatentId(id, apiType);
          
          if (apiType === 'unified') {
            // Use Unified Patents API
            try {
              const result = await patentApi.searchPatentsUnified(formattedId);
              const normalizedResult = normalizePatentResponse(result, 'unified');
              
              if (!normalizedResult) {
                return {
                  patentId: id,
                  status: 'error' as const,
                  error: 'No data found for this patent ID'
                };
              }
              
              return {
                patentId: id,
                status: 'success' as const,
                title: normalizedResult.title,
                abstract: normalizedResult.abstract,
                details: normalizedResult.details
              };
            } catch (error) {
              console.error('Unified API error:', error);
              throw error;
            }
          } else {
            // Use SerpAPI
            const result = await patentApi.searchPatentsSerpApi(formattedId);
            console.log('SerpAPI response structure:', {
              statusCode: result.statusCode,
              hasData: !!result.data,
              keys: result.data ? Object.keys(result.data) : [],
              hasOrganicResults: result.data && result.data.organic_results ? 
                result.data.organic_results.length : 'No organic_results'
            });
            
            // Try to normalize both the result and result.data to see which works
            let normalizedResult = normalizePatentResponse(result, 'serpapi');
            if (!normalizedResult && result.data) {
              normalizedResult = normalizePatentResponse(result.data, 'serpapi');
            }
            
            if (!normalizedResult) {
              console.error('Failed to normalize SerpAPI response:', result);
              return {
                patentId: id,
                status: 'error' as const,
                error: 'Failed to process patent data'
              };
            }
            
            // For SerpAPI, make sure to store all the detailed info we received
            // to avoid unnecessary API calls later
            return {
              patentId: id,
              status: 'success' as const,
              title: normalizedResult.title || `Patent ${id}`,
              abstract: normalizedResult.abstract || 'Click View Details to see full information',
              details: normalizedResult.details
            };
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Patent not found or invalid ID';
          return {
            patentId: id,
            status: 'error' as const,
            error: errorMessage
          };
        }
      });

      return await Promise.all(promises);
    }
    
    // Smart search implementation
    try {
      const smartSearchQuery = idsToSearch.join(' OR ');
      const result = await patentApi.searchPatentsSerpApi(smartSearchQuery);
      console.log('Smart search response:', result);
      
      if (!result || result.error) {
        return [{
          patentId: idsToSearch[0],
          status: 'error' as const,
          error: result?.error || 'No results found for this search query'
        }];
      }
      
      // For smart search using SerpAPI
      if (apiType === 'serpapi') {
        // Get the data from the response
        const data = result.data || result;
        
        // Use the normalizePatentResponse to handle different response structures
        const normalizedResponse = normalizePatentResponse(data, 'serpapi');
        
        // If we got a valid normalized response for a single patent, return it
        if (normalizedResponse && normalizedResponse.patentId) {
          return [{
            patentId: normalizedResponse.patentId,
            title: normalizedResponse.title || 'Unknown Title',
            abstract: normalizedResponse.abstract || 'No abstract available',
            status: 'success' as const,
            details: normalizedResponse.details
          }];
        }
        
        // If the normalizer didn't work, try to extract organic_results directly
        const patents = Array.isArray(data.organic_results) ? data.organic_results : [];
        
        if (patents.length === 0) {
          return [{
            patentId: idsToSearch[0],
            status: 'error' as const,
            error: 'No patent results found for this search query'
          }];
        }
        
        // Map the organic results to PatentSummary objects
        return patents.map((patent: any) => {
          // Try to normalize each individual patent
          const normalizedPatent = normalizePatentResponse({
            patent_id: patent.patent_id,
            title: patent.title,
            snippet: patent.snippet,
            assignee: patent.assignee,
            publication_date: patent.publication_date,
            priority_date: patent.priority_date
          }, 'serpapi');
          
          return {
            patentId: patent.patent_id || patent.title || 'Unknown',
            title: patent.title || 'Unknown Title',
            abstract: patent.snippet || 'No abstract available',
            status: 'success' as const,
            details: normalizedPatent?.details || {
              assignee_current: [patent.assignee || 'Unknown'],
              publication_date: patent.publication_date || '',
              priority_date: patent.priority_date || '',
            }
          };
        });
      } else {
        // For unified API smart search (if implemented)
        return [{
          patentId: idsToSearch[0],
          status: 'error' as const,
          error: 'Smart search not supported for Unified API'
        }];
      }
    } catch (error) {
      throw error;
    }
  };

  const handlePatentSelect = (patentId: string) => {
    if (selectedPatent) {
      // We're in the full details view, and a family member was clicked
      
      // Create a temporary patent summary with loading state
      const tempPatent: PatentSummary = {
        patentId: patentId,
        status: 'loading',
        title: `Loading ${patentId}...`,
        abstract: 'Fetching patent information...'
      };
      
      // Update the UI to show we're loading the new patent
      setSelectedPatent(tempPatent);
      
      // Fetch the full details of the new patent
      dispatch(fetchFullPatentDetails(patentId));
    } else {
      // Standard behavior when not in the modal
      setSearchQuery(patentId);
      const apiType = detectApiType(patentId);
      setSelectedApi(apiType);
    }
  };

  const handleViewDetails = async (summary: PatentSummary) => {
    // Set the selected patent immediately to show the modal
    setSelectedPatent(summary);
    
    // Only fetch if we don't have the full details yet
    if (!summary.details?.description || !summary.details?.claims || !summary.details?.figures) {
      dispatch(fetchFullPatentDetails(summary.patentId));
    }
  };

  // Handle smart search modal selection
  const handleSmartSearch = (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    
    // For smart search, we'll set up different loading state
    const initialSummaries = [{
      patentId: selectedIds.join(' OR '),
      status: 'loading' as const,
    }];
    
    setPatentSummaries(initialSummaries);
    setIsSearching(true);
    setIsLoading(true);
    
    handleSearch(selectedIds, 'smart', selectedApi)
      .then(results => {
        setPatentSummaries(results);
        onSearch(selectedIds);
      })
      .catch(error => {
        console.error('Smart search error:', error);
        setPatentSummaries([{
          patentId: selectedIds[0],
          status: 'error' as const,
          error: error.message || 'An unexpected error occurred during smart search'
        }]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Update the selected patent when Redux state changes (for family member patents)
  useEffect(() => {
    if (selectedPatent && 
        selectedPatent.status === 'loading' && 
        !patentsState.isLoading &&
        patentsState.selectedPatent &&
        patentsState.selectedPatent.patentId === selectedPatent.patentId) {
      
      // Update the selected patent with the loaded data
      const updatedPatent: PatentSummary = {
        ...selectedPatent,
        status: 'success',
        details: patentsState.selectedPatent,
        title: patentsState.selectedPatent.title || selectedPatent.title,
        abstract: patentsState.selectedPatent.abstract || selectedPatent.abstract
      };
      
      setSelectedPatent(updatedPatent);
    }
  }, [patentsState.isLoading, patentsState.selectedPatent, selectedPatent]);

  // Add effect to handle body scroll when modal is open
  useEffect(() => {
    if (selectedPatent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPatent]);

  // Handler for direct family search
  const handleDirectFamilySearch = () => {
    // Split the searchQuery by commas or spaces to get multiple patent IDs
    const patentIds = searchQuery
      .split(/[\s,]+/)
      .map(id => id.trim())
      .filter(id => id);
    
    if (patentIds.length > 0) {
      setShowFamilySearchModal(true);
    } else {
      toast.error('Please enter at least one valid patent ID to search for family members.');
    }
  };

  return (
    <div className="patent-search">
      {!selectedPatent && (
        <>
          <h2>Patent Search</h2>
          <PatentSearchForm
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            patentIds={patentIds}
            setPatentIds={setPatentIds}
            isLoading={isLoading}
            selectedApi={selectedApi}
            setSelectedApi={setSelectedApi}
            searchType={searchType}
            setSearchType={setSearchType}
            setShowSmartSearchModal={setShowSmartSearchModal}
            onSearch={handlePerformSearch}
            formatPatentId={formatPatentId}
          />
          
          {searchQuery.trim() && (
            <div className="additional-search-options">
              <button 
                className="family-search-direct-btn" 
                onClick={handleDirectFamilySearch}
                disabled={isLoading || !searchQuery.trim()}
              >
                <FontAwesomeIcon icon={faProjectDiagram} />
                Search Patent Family
              </button>
            </div>
          )}
        </>
      )}

      {isLoading && <Loader fullScreen text="Searching patents..." />}

      {patentSummaries.length > 0 && (
        <PatentSummaryList
          patentSummaries={patentSummaries}
          selectedPatent={selectedPatent}
          setSelectedPatent={setSelectedPatent}
          onViewDetails={handleViewDetails}
          onPatentSelect={handlePatentSelect}
          patentsState={patentsState}
          formatDate={formatDate}
          apiSource={selectedApi}
        />
      )}

      {/* Smart Search Modal */}
      <SmartSearchModal
        isOpen={showSmartSearchModal}
        onClose={() => setShowSmartSearchModal(false)}
        patentIds={patentIds}
        onSearch={handleSmartSearch}
        selectedApi={selectedApi}
      />
      
      {/* Family Search Modal */}
      {showFamilySearchModal && (
        <FamilySearchModal
          patentId={patentIds.length > 0 ? patentIds : searchQuery.trim()}
          onClose={() => setShowFamilySearchModal(false)}
          onPatentSelect={handlePatentSelect}
        />
      )}
    </div>
  );
};

export default PatentSearch; 