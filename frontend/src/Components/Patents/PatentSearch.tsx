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
    if (apiType === 'unified') {
      // Use Unified Patents API for both direct and smart search
      try {
        const result = await patentApi.searchMultiplePatentsUnified(idsToSearch, searchType);
        
        // The response will be in hits.hits array, sorted by portfolio_score
        const hits = result.hits?.hits || [];
        
        // Map the hits to our patent format
        const patents = hits.map((hit: any) => {
          const source = hit._source;
          return {
            patentId: source?.ucid_spif || '',
            status: 'success' as const,
            title: source?.title || '',
            abstract: source?.abstract || '',
            details: {
              assignee_current: source?.assignee_current || [],
              assignee_original: source?.assignee_original || [],
              assignee_parent: source?.assignee_parent || [],
              priority_date: source?.priority_date || '',
              publication_date: source?.publication_date || '',
              grant_date: source?.grant_date || '',
              expiration_date: source?.expiration_date || '',
              application_date: source?.application_date || '',
              application_number: source?.application_number || '',
              grant_number: source?.grant_number || '',
              publication_number: source?.publication_number || '',
              publication_status: source?.publication_status || '',
              publication_type: source?.publication_type || '',
              type: source?.type || '',
              country: source?.country || '',
              kind_code: source?.kind_code || '',
              inventors: source?.inventors || [],
              examiner: source?.examiner || [],
              law_firm: source?.law_firm || '',
              cpc_codes: source?.cpc_codes || [],
              uspc_codes: source?.uspc_codes || [],
              num_cit_pat: source?.num_cit_pat || 0,
              num_cit_npl: source?.num_cit_npl || 0,
              num_cit_pat_forward: source?.num_cit_pat_forward || 0,
              citations_pat_forward: source?.citations_pat_forward || [],
              portfolio_score: source?.portfolio_score || 0,
              litigation_score: source?.litigation_score || 0,
              rating_broadness: source?.rating_broadness || '',
              rating_citation: source?.rating_citation || '',
              rating_litigation: source?.rating_litigation || '',
              rating_validity: source?.rating_validity || '',
              family_id: source?.family_id || '',
              extended_family_id: source?.extended_family_id || '',
              hyperlink_google: source?.hyperlink_google || '',
              is_litigated: source?.is_litigated || 'false',
              is_challenged: source?.is_challenged || 'false',
              num_litigated: source?.num_litigated || 0,
              num_challenged: source?.num_challenged || 0,
              last_litigated_at: source?.last_litigated_at || null,
              last_challenged_at: source?.last_challenged_at || null,
              family_annuities: source?.family_annuities || 0,
              norm_family_annuities: source?.norm_family_annuities || 0,
              rnix_score: source?.rnix_score || 0
            }
          };
        });

        return patents;
      } catch (error) {
        console.error('Unified API error:', error);
        throw error;
      }
    }

    // For other API sources, use the existing logic
    const promises = idsToSearch.map(async (id) => {
      try {
        const formattedId = formatPatentId(id, apiType);
        const result = await patentApi.searchPatents(formattedId, apiType);
        const normalizedResult = normalizePatentResponse(result, apiType);
        
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
        console.error(`Error searching patent ${id}:`, error);
        return {
          patentId: id,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    });

    return await Promise.all(promises);
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
      dispatch(fetchFullPatentDetails({ patentId, apiType: selectedApi }));
    } else {
      // Standard behavior when not in the modal
      setSearchQuery(patentId);
      const apiType = detectApiType(patentId);
      setSelectedApi(apiType);
    }
  };

  const handleViewDetails = async (summary: PatentSummary) => {
    // Flag to track if we're initiating a fetch
    let isFetchInitiated = false;
    
    // Set the selected patent immediately to show the modal
    setSelectedPatent(summary);
    
    // For Unified API smart search, we need to format the patent ID correctly
    if (selectedApi === 'unified') {
      // Get the base patent number from the grant_number or patentId
      const basePatentNumber = summary.details?.grant_number || summary.patentId;
      
      // Only fetch if we don't have the full details yet
      if (!summary.details?.description || !summary.details?.claims || !summary.details?.figures) {
        isFetchInitiated = true;
        
        // Extract components and format properly for Unified API
        let formattedId = basePatentNumber;
        
        // If the ID is just numbers (like "8125463"), add US and B2
        if (/^\d+$/.test(basePatentNumber)) {
          formattedId = `US-${basePatentNumber}-B2`;
        } 
        // If it has country code but no kind code (like "US8125463"), add B2
        else if (/^[A-Z]{2}\d+$/.test(basePatentNumber)) {
          const countryCode = basePatentNumber.substring(0, 2);
          const number = basePatentNumber.substring(2);
          formattedId = `${countryCode}-${number}-B2`;
        }
        // If it's not in correct format with hyphens, format it
        else if (!basePatentNumber.includes('-')) {
          formattedId = formatPatentId(basePatentNumber, 'unified');
        }

        console.log('Initiating fetch from handleViewDetails for Unified API patent:', formattedId);
        
        // Dispatch the action with the properly formatted ID
        dispatch(fetchFullPatentDetails({ 
          patentId: formattedId, 
          apiType: selectedApi 
        }));
      } else {
        console.log('Using existing details for Unified API patent, no fetch needed:', basePatentNumber);
      }
    } else {
      // For other APIs, keep existing behavior
      if (!summary.details?.description || !summary.details?.claims || !summary.details?.figures) {
        isFetchInitiated = true;
        console.log('Initiating fetch from handleViewDetails for patent:', summary.patentId);
        dispatch(fetchFullPatentDetails({ patentId: summary.patentId, apiType: selectedApi }));
      } else {
        console.log('Using existing details for patent, no fetch needed:', summary.patentId);
      }
    }
    
    // Store the fetch status with the selected patent
    setSelectedPatent({
      ...summary,
      initialFetch: isFetchInitiated
    });
  };

  // Handle smart search modal selection
  const handleSmartSearch = async (idsToSearch: string[]) => {
    try {
      setIsLoading(true);
      setPatentSummaries([]);

      // Use Unified Patents API if selected
      if (selectedApi === 'unified') {
        try {
          const result = await patentApi.searchMultiplePatentsUnified(idsToSearch, 'smart');
          
          // The response will be in hits.hits array, sorted by portfolio_score
          const hits = result.hits?.hits || [];
          
          // Map the hits to our patent format
          const patents = hits.map((hit: any) => {
            const source = hit._source;
            return {
              patentId: source?.ucid_spif || '',
              status: 'success' as const,
              title: source?.title || '',
              abstract: source?.abstract || '',
              details: {
                assignee_current: source?.assignee_current || [],
                assignee_original: source?.assignee_original || [],
                assignee_parent: source?.assignee_parent || [],
                priority_date: source?.priority_date || '',
                publication_date: source?.publication_date || '',
                grant_date: source?.grant_date || '',
                expiration_date: source?.expiration_date || '',
                application_date: source?.application_date || '',
                application_number: source?.application_number || '',
                grant_number: source?.grant_number || '',
                publication_number: source?.publication_number || '',
                publication_status: source?.publication_status || '',
                publication_type: source?.publication_type || '',
                type: source?.type || '',
                country: source?.country || '',
                kind_code: source?.kind_code || '',
                inventors: source?.inventors || [],
                examiner: source?.examiner || [],
                law_firm: source?.law_firm || '',
                cpc_codes: source?.cpc_codes || [],
                uspc_codes: source?.uspc_codes || [],
                num_cit_pat: source?.num_cit_pat || 0,
                num_cit_npl: source?.num_cit_npl || 0,
                num_cit_pat_forward: source?.num_cit_pat_forward || 0,
                citations_pat_forward: source?.citations_pat_forward || [],
                portfolio_score: source?.portfolio_score || 0,
                litigation_score: source?.litigation_score || 0,
                rating_broadness: source?.rating_broadness || '',
                rating_citation: source?.rating_citation || '',
                rating_litigation: source?.rating_litigation || '',
                rating_validity: source?.rating_validity || '',
                family_id: source?.family_id || '',
                extended_family_id: source?.extended_family_id || '',
                hyperlink_google: source?.hyperlink_google || '',
                is_litigated: source?.is_litigated || 'false',
                is_challenged: source?.is_challenged || 'false',
                num_litigated: source?.num_litigated || 0,
                num_challenged: source?.num_challenged || 0,
                last_litigated_at: source?.last_litigated_at || null,
                last_challenged_at: source?.last_challenged_at || null,
                family_annuities: source?.family_annuities || 0,
                norm_family_annuities: source?.norm_family_annuities || 0,
                rnix_score: source?.rnix_score || 0
              }
            };
          });

          setPatentSummaries(patents);
          return;
        } catch (error) {
          console.error('Unified API error:', error);
          throw error;
        }
      }

      // For other API sources, use the existing logic
      const results = await Promise.all(
        idsToSearch.map(async (id) => {
          try {
            const result = await patentApi.searchPatents(id, selectedApi);
            const normalizedResult = normalizePatentResponse(result, selectedApi);
            
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
            console.error(`Error searching patent ${id}:`, error);
            return {
              patentId: id,
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
          }
        })
      );

      setPatentSummaries(results);
    } catch (error) {
      console.error('Smart search error:', error);
      setPatentSummaries([{
        patentId: idsToSearch[0],
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'An error occurred during smart search'
      }]);
    } finally {
      setIsLoading(false);
    }
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
          apiSource={selectedApi}
        />
      )}
    </div>
  );
};

export default PatentSearch; 