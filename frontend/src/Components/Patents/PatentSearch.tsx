import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../Redux/hooks';
import { RootState } from '../../Redux/store';
import { fetchFullPatentDetails, setFilters, setSmartSearchResults } from '../../Redux/slices/patentSlice';
import './PatentSearch.scss';
// import PatentDetails from './PatentDetails';
import Loader from '../Common/Loader';
import SmartSearchModal from './SmartSearchModal';
import PatentSearchForm from './PatentSearchForm';
import PatentSummaryList from './PatentSummaryList';
import { detectApiType, formatDate } from './utils';
import { PatentSummary } from './types';
import { ApiSource, patentApi, normalizePatentResponse } from '../../api/patents';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
import { filterPatentsByFamilyId } from '../../utils/patentUtils';
import { authApi } from '../../api/auth';
// import PatentSummaryList from './PatentSummaryList';
// import { PatentSummary, ApiSource } from './types';
// import { formatDate, detectApiType } from './utils';

interface PatentSearchProps {
  onSearch: (patentIds: string[]) => void;
  initialPatentId?: string;
}

// Update interface for hit type with optional fields
interface PatentHit {
  _id: string;
  _source: {
    country: string;
    assignee_original: string[];
    family_annuities: number;
    abstract: string | null;
    application_date: string;
    application_number: string;
    assignee_current: string[];
    assignee_parent: string[];
    cpc_codes: string[];
    description: string | null;
    examiner: string[];
    expiration_date: string;
    extended_family_id: string;
    family_id: string;
    figures: any[];
    grant_date: string;
    grant_number: string;
    hyperlink_google: string;
    inventors: string[];
    is_challenged: string;
    is_litigated: string;
    kind_code: string;
    last_challenged_at: string | null;
    last_litigated_at: string | null;
    law_firm: string;
    litigation_score: number;
    norm_family_annuities: number;
    num_challenged: number;
    num_cit_npl: number;
    num_cit_pat: number;
    num_cit_pat_forward: number;
    num_litigated: number;
    portfolio_score: number;
    priority_date: string;
    publication_date: string;
    publication_number: string;
    publication_status: string;
    publication_type: string;
    rating_broadness: string;
    rating_citation: string;
    rating_litigation: string;
    rating_validity: string;
    rnix_score: number;
    title: string;
    type: string;
    ucid_spif: string[];
    uspc_codes: string[];
    citations_pat_forward?: string[]; // Make optional
    filing_date?: string; // Make optional
  };
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
  const [selectedFilter, setSelectedFilter] = useState<'grant' | 'application'>('grant');
  const [selectedTypes, setSelectedTypes] = useState({ grant: true, application: true });
  const [filterByFamily, setFilterByFamily] = useState(true);
  const [notFoundPatents, setNotFoundPatents] = useState<string[]>([]);
  
  const dispatch = useAppDispatch();
  const { filters, smartSearchResults } = useAppSelector((state: RootState) => state.patents);

  // Add this function to standardize patent ID processing
  const processPatentIds = (input: string): string[] => {
    // First split by newlines
    const lines = input.split(/\n/);
    
    // Process each line - split by commas or spaces if present
    const processedIds = lines.flatMap(line => 
      line
        .split(/[,\s]+/)
        .map(id => id.trim())
        .filter(id => id)
    );

    // Remove duplicates and empty strings
    return [...new Set(processedIds)].filter(Boolean);
  };

  // Update the useEffect for initialPatentId
  useEffect(() => {
    if (initialPatentId) {
      setSearchQuery(initialPatentId);
      
      // Process patent IDs using the new function
      const ids = processPatentIds(initialPatentId);
      
      if (ids.length > 0) {
        setPatentIds(ids);
        
        // Auto-detect API type from the first patent ID
        const apiType = detectApiType(ids[0]);
        setSelectedApi(apiType);
      }
    }
  }, [initialPatentId]);
  
  // Update the populate callback
  useEffect(() => {
    window.patentSearchPopulateCallback = (patentId: string) => {
      setSearchQuery(patentId);
      
      // Process patent IDs using the new function
      const ids = processPatentIds(patentId);
      
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
    // Clear previous results when starting a new search
    setPatentSummaries([]);
    setNotFoundPatents([]); // Clear previous not found patents
    setIsLoading(true);
    
    // Format the IDs before searching
    const formattedIds = idsToSearch.map(id => {
      if (selectedApi === 'unified') {
        // For unified API, ensure proper format (XX-NNNNNN-YY)
        if (/^\d+$/.test(id)) {
          // If just numbers, assume US patent
          return `US-${id}-B2`;
        } else if (/^[A-Z]{2}\d+$/.test(id)) {
          // If country code + numbers, add B2
          const countryCode = id.substring(0, 2);
          const number = id.substring(2);
          return `${countryCode}-${number}-B2`;
        } else if (!id.includes('-')) {
          return formatPatentId(id, 'unified');
        }
      }
      return id;
    });

    try {
      if (searchType === 'smart' && selectedApi === 'unified') {
        // For smart search - use special flow with modal
        console.log("Making API call to searchMultiplePatentsUnified with", formattedIds, "using smart search");
        const result = await patentApi.searchMultiplePatentsUnified(formattedIds, 'smart');
        console.log("Smart search API result received:", result);
        
        // Store in Redux
        dispatch(setSmartSearchResults(result));
        
        // Track not found patents
        if (result?.hits?.hits) {
          const foundPatents = new Set(result.hits.hits.map((hit: any) => hit._id));
          const notFound = formattedIds.filter(id => !foundPatents.has(id));
          setNotFoundPatents(notFound);
        }
        
        // For smart search, open modal and wait for user to select filters
        setShowSmartSearchModal(true);
        onSearch(formattedIds);
        
        // Set loading to false after receiving results
        setIsLoading(false);
      } else if (searchType === 'full' && selectedApi === 'unified') {
        // For full search with unified API - use direct search
        console.log("Making unified API full search call with", formattedIds);
        try {
          // Make specific call to patentApi.searchMultiplePatentsUnified with direct type
          const result = await patentApi.searchMultiplePatentsUnified(formattedIds, 'direct');
          console.log("Unified API full search results received:", result);
          
          // Process the results directly without waiting for a modal
          if (result && result.hits && result.hits.hits) {
            const hits = result.hits.hits;
            const patents = hits.map((hit: any) => {
              const source = hit._source;
              return {
                patentId: source?.ucid_spif?.[0] || source?.publication_number || hit._id || '',
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
            
            // Add patents to search history and create folder if needed
            try {
              const patentIds = patents.map((patent: PatentSummary) => patent.patentId);
              
              // If there's only one patent, add it to search history directly
              if (patentIds.length === 1) {
                await authApi.addToSearchHistory(patentIds[0], 'direct_search');
                console.log(`Added single patent ${patentIds[0]} to search history`);
              } 
              // If there are multiple patents, create a folder to contain them
              else if (patentIds.length > 1) {
                // Generate a folder name with date and time
                const folderName = `Direct Search ${new Date().toLocaleString()}`;
                
                // Create a custom patent list for multiple patents
                await authApi.saveCustomPatentList(folderName, patentIds, 'direct_search');
                
                // Also add individual patents to search history for tracking
                for (const patentId of patentIds) {
                  await authApi.addToSearchHistory(patentId, 'direct_search');
                }
                
                console.log(`Created folder "${folderName}" with ${patentIds.length} patents`);
                
                // Show success message about folder creation
                toast.success(
                  `Created folder "${folderName}" with ${patentIds.length} patents`, 
                  { duration: 4000 }
                );
              }
            } catch (error) {
              console.error("Error saving patents to history:", error);
              // Don't show error toast to avoid overwhelming the user with multiple errors
            }
          } else {
            throw new Error('Invalid API response structure');
          }
          
          onSearch(formattedIds);
        } catch (error: any) {
          console.error('Unified API full search error:', error);
          setPatentSummaries([{
            patentId: formattedIds[0],
            status: 'error' as const,
            error: error.message || 'An unexpected error occurred during unified search'
          }]);
        }
      } else {
        // For other API sources or types - use standard search
        console.log("Making direct search API call with", formattedIds);
        const searchResults = await handleSearch(formattedIds, 'direct', selectedApi);
        console.log("Direct search results received");
        
        // Update UI with results immediately for full search
        setPatentSummaries(searchResults);
        onSearch(formattedIds);
        
        // Add patents to search history and create folder if needed
        try {
          // Filter out error results
          const successfulPatents = searchResults.filter(result => result.status === 'success');
          const patentIds = successfulPatents.map(patent => patent.patentId);
          
          if (patentIds.length > 0) {
            // If there's only one patent, add it to search history directly
            if (patentIds.length === 1) {
              await authApi.addToSearchHistory(patentIds[0], 'other_api');
              console.log(`Added single patent ${patentIds[0]} to search history`);
            } 
            // If there are multiple patents, create a folder to contain them
            else if (patentIds.length > 1) {
              // Generate a folder name with date and time
              const folderName = `Search Results ${new Date().toLocaleString()}`;
              
              // Create a custom patent list for multiple patents
              await authApi.saveCustomPatentList(folderName, patentIds, 'other_api');
              
              // Also add individual patents to search history for tracking
              for (const patentId of patentIds) {
                await authApi.addToSearchHistory(patentId, 'other_api');
              }
              
              console.log(`Created folder "${folderName}" with ${patentIds.length} patents`);
              
              // Show success message about folder creation
              toast.success(
                `Created folder "${folderName}" with ${patentIds.length} patents`, 
                { duration: 4000 }
              );
            }
          }
        } catch (error) {
          console.error("Error saving patents to history:", error);
          // Don't show error toast to avoid overwhelming the user with multiple errors
        }
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setPatentSummaries([{
        patentId: formattedIds[0],
        status: 'error' as const,
        error: error.message || 'An unexpected error occurred during search'
      }]);
      
      toast.error(`Error searching patents: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add filter function
  const filterSearchResults = (results: PatentSummary[]) => {
    return results.filter(patent => {
      // Filter by publication type
      const isGrant = patent.details?.type?.toLowerCase().includes('grant');
      const isApplication = patent.details?.type?.toLowerCase().includes('application');
      
      if (!filters.showGrantPatents && isGrant) return false;
      if (!filters.showApplicationPatents && isApplication) return false;
      
      return true;
    });
  };

  // Modify handleSearch to include filtering
  const handleSearch = async (
    idsToSearch: string[],
    searchType: 'direct' | 'smart',
    apiType: ApiSource
  ): Promise<PatentSummary[]> => {
    if (apiType === 'unified') {
      try {
        console.log(`Calling searchMultiplePatentsUnified with type: ${searchType}`);
        const result = await patentApi.searchMultiplePatentsUnified(idsToSearch, searchType);
        console.log(`Received ${searchType} search results:`, result);
        
        // Only store results in Redux and check for modal if this is a smart search
        if (searchType === 'smart') {
          dispatch(setSmartSearchResults(result));
          
          // For smart search mode, if showSmartSearchModal is true, don't process results now
          if (showSmartSearchModal) {
            return [];
          }
        } else {
          // For direct search, we still want to store results but not wait for modal
          dispatch(setSmartSearchResults(result));
        }
        
        const hits = result.hits?.hits || [];
        
        // Filter patents by family_id if enabled
        const filteredHits = filters.filterByFamilyId 
          ? filterPatentsByFamilyId(hits, true, true)
          : hits;
        
        // Map the hits to our patent format
        const patents = filteredHits.map((hit: any) => {
          const source = hit._source;
          return {
            patentId: source?.ucid_spif?.[0] || source?.publication_number || hit._id || '',
            status: 'success' as const,
            title: source?.title || '',
            abstract: source?.abstract || '',
            details: {
              grant_number: source?.grant_number || '',
              expiration_date: source?.expiration_date || '',
              assignee_current: source?.assignee_current || [],
              type: source?.type || '',
              num_cit_pat: source?.num_cit_pat || 0,
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

        // Apply publication type filters
        return filterSearchResults(patents);
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
    setSelectedPatent(summary);
    
    if (selectedApi === 'unified') {
      // Use the original patentId directly without any formatting
      const patentId = summary.patentId;
      
      // Check if we need to fetch full details and if we haven't already fetched them
      if (!summary.details?.description || !summary.details?.claims || !summary.details?.figures) {
        // Add initialFetch flag to prevent repeat API calls
        if (!summary.initialFetch) {
          // Set a marker that we've started fetching
          const updatedSummary = { ...summary, initialFetch: true };
          setSelectedPatent(updatedSummary);

          dispatch(fetchFullPatentDetails({ 
            patentId: patentId, 
            apiType: selectedApi 
          }));
        }
      }
    }
  };

  // Update SmartSearchModal callback to handle filter selection
  const handleSmartSearch = (idsToSearch: string[]) => {
    // Just handle the IDs returned from the SmartSearchModal
    // and pass them to the main search function
    handlePerformSearch(idsToSearch);
  };

  // Update the useEffect for handling smartSearchResults
  useEffect(() => {
    if (smartSearchResults && smartSearchResults.hits && smartSearchResults.hits.hits) {
      // For smart search, we only want to update patentSummaries when the Apply Filter button is clicked
      // This logic is now in the handleApplyFilter function
      console.log("Smart search results are available. Waiting for user to apply filter.");
      
      // For full search (not smart search), we can immediately process and display results
      if (!showSmartSearchModal && searchType === 'full') {
        console.log("Processing results for full search");
        try {
          // Process the results and update UI
          const hitsArray = smartSearchResults.hits.hits;
          
          const patents = hitsArray.map((hit: any) => {
            const source = hit._source;
            return {
              patentId: source?.ucid_spif?.[0] || source?.publication_number || hit._id || '',
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
        } catch (error) {
          console.error('Error processing full search results:', error);
          toast.error('Error processing search results');
        } finally {
          setIsLoading(false);
        }
      }
    }
  }, [smartSearchResults, searchType, showSmartSearchModal]);

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

  // Add applyFilter function to update UI based on filtered results
  const handleApplyFilter = async () => {
    try {
      if (smartSearchResults && smartSearchResults.hits && smartSearchResults.hits.hits) {
        // Get the filtered patent IDs directly from Redux
        const filteredPatentIds = filters.filteredPatentIds || [];
        
        console.log(`Found ${filteredPatentIds.length} patents matching the filter criteria`);
        
        // Find the full patent data from the IDs
        const filteredHits = smartSearchResults.hits.hits.filter((hit: any) => {
          const hitId = hit._source.publication_number || hit._id;
          return filteredPatentIds.includes(hitId);
        });
        
        if (filteredHits.length === 0) {
          toast.error('No patents match the selected filter criteria');
          return;
        }
        
        // Map the filtered hits to patent summaries
        const patents = filteredHits.map((hit: any) => {
          const source = hit._source;
          return {
            patentId: source?.ucid_spif?.[0] || source?.publication_number || hit._id || '',
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

        // Update Redux with the filtered patents
        dispatch(setFilters({
          showGrantPatents: selectedTypes.grant,
          showApplicationPatents: selectedTypes.application,
          filteredPatents: patents
        }));
        
        // Update local state with the filtered patents
        setPatentSummaries(patents);
        
        // Close the smart search modal
        setShowSmartSearchModal(false);
        
        // Add patents to search history and create folder if needed
        try {
          const patentIds = patents.map((patent: PatentSummary) => patent.patentId);
          
          if (patentIds.length === 1) {
            await authApi.addToSearchHistory(patentIds[0], 'search');
          } else if (patentIds.length > 1) {
            const folderName = `Patent Search ${new Date().toLocaleString()}`;
            await authApi.saveCustomPatentList(folderName, patentIds, 'search');
            for (const patentId of patentIds) {
              await authApi.addToSearchHistory(patentId, 'search');
            }
            toast.success(`Created folder "${folderName}" with ${patentIds.length} patents`, { duration: 4000 });
          }
        } catch (error) {
          console.error("Error saving patents to history:", error);
        }
      } else {
        toast.error('No search results available to filter');
      }
    } catch (error: any) {
      console.error('Error applying filters:', error);
      toast.error(`Error applying filters: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to sync with Redux state
  useEffect(() => {
    if (filters.filteredPatents) {
      setPatentSummaries(filters.filteredPatents);
    }
  }, [filters.filteredPatents]);

  // Add a handler for when the SmartSearchModal is closed without applying a filter
  const handleSmartSearchModalClose = () => {
    console.log("SmartSearchModal closed without applying filter");
    // Reset loading state
    setIsLoading(false);
    // Clear patent summaries to prevent showing lingering loading indicators
    setPatentSummaries([]);
    // Close the modal
    setShowSmartSearchModal(false);
  };

  // Add cleanup useEffect
  useEffect(() => {
    // Cleanup function that runs when component unmounts
    return () => {
      // Clear any search state
      setIsLoading(false);
      setIsSearching(false);
      setShowSmartSearchModal(false);
    };
  }, []); // Empty dependency array means this runs only on mount/unmount

  const handleSearchTypeChange = (type: 'full' | 'smart') => {
    setSearchType(type);
    // Clear all relevant state when switching search types
    setPatentSummaries([]);
    setSelectedPatent(null);
    setShowSmartSearchModal(false);
    dispatch(setSmartSearchResults(null));
    dispatch(setFilters({
      showGrantPatents: true,
      showApplicationPatents: true,
      filteredPatents: null
    }));
    // Preserve filterByFamily state
    setFilterByFamily(true);
  };

  // Add this function to handle corrected patent searches from modal
  const handleCorrectedPatentSearch = async (correctedIds: string[]) => {
    // Format the IDs before searching
    const formattedIds = correctedIds.map(id => {
      if (selectedApi === 'unified') {
        if (/^\d+$/.test(id)) {
          return `US-${id}-B2`;
        } else if (/^[A-Z]{2}\d+$/.test(id)) {
          const countryCode = id.substring(0, 2);
          const number = id.substring(2);
          return `${countryCode}-${number}-B2`;
        } else if (!id.includes('-')) {
          return formatPatentId(id, 'unified');
        }
      }
      return id;
    });

    try {
      console.log("Making API call for corrected patents:", formattedIds);
      const result = await patentApi.searchMultiplePatentsUnified(formattedIds, 'smart');
      console.log("Corrected patents search result:", result);
      
      if (result?.hits?.hits) {
        // Get existing results from Redux
        const existingResults = smartSearchResults || { hits: { hits: [] } };
        const existingHits = existingResults.hits.hits || [];
        const newHits = result.hits.hits;
        
        // Combine results, avoiding duplicates
        const combinedHits = [...existingHits];
        const foundPatentIds = new Set<string>();
        
        newHits.forEach((newHit: any) => {
          const exists = combinedHits.some(existingHit => existingHit._id === newHit._id);
          if (!exists) {
            combinedHits.push(newHit);
          }
          foundPatentIds.add(newHit._id);
        });

        // Update Redux with combined results
        const updatedResults = {
          ...result,
          hits: {
            ...result.hits,
            hits: combinedHits,
            total: {
              value: combinedHits.length,
              relation: "eq"
            }
          }
        };
        dispatch(setSmartSearchResults(updatedResults));

        // Update filters in Redux to include new patents
        const currentFilters = filters || {
          showGrantPatents: true,
          showApplicationPatents: true,
          filteredPatentIds: []
        };

        const updatedFilteredPatentIds = [
          ...(currentFilters.filteredPatentIds || []),
          ...Array.from(foundPatentIds)
        ];

        dispatch(setFilters({
          ...currentFilters,
          filteredPatentIds: [...new Set(updatedFilteredPatentIds)] // Remove duplicates
        }));

        // Show success/error messages
        const foundCount = foundPatentIds.size;
        const notFoundCount = formattedIds.length - foundCount;

        if (foundCount > 0) {
          toast.success(
            `Found ${foundCount} patent${foundCount > 1 ? 's' : ''} and added to results`
          );
        }
        if (notFoundCount > 0) {
          toast.error(
            `${notFoundCount} patent${notFoundCount > 1 ? 's' : ''} still not found`
          );
        }

        // Return the found patent IDs
        return { success: true, foundPatentIds };
      }
      return { success: false };
    } catch (error: any) {
      console.error('Error searching corrected patents:', error);
      toast.error(error.message || 'Error searching patents');
      return { success: false };
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
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
          />
        </>
      )}

      {isLoading && <Loader fullScreen text="Searching patents..." />}

      {/* Debug logging */}
      {(() => {
        console.log("Debug - PatentSearch render state:", {
          patentSummariesLength: patentSummaries.length,
          isLoading,
          selectedPatent: !!selectedPatent,
          showSmartSearchModal,
          smartSearchResults: !!smartSearchResults,
          filteredPatentsInRedux: filters.filteredPatents?.length
        });
        return null;
      })()}
      
      {patentSummaries.length > 0 && !isLoading && (
        <PatentSummaryList
          patentSummaries={patentSummaries}
          selectedPatent={selectedPatent}
          setSelectedPatent={setSelectedPatent}
          onViewDetails={handleViewDetails}
          onPatentSelect={handlePatentSelect}
          formatDate={formatDate}
          apiSource={selectedApi}
        />
      )}

      {/* Smart Search Modal */}
      <SmartSearchModal
        isOpen={showSmartSearchModal}
        onClose={handleSmartSearchModalClose}
        onApplyFilter={handleApplyFilter}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        filterByFamily={filterByFamily}
        setFilterByFamily={setFilterByFamily}
        notFoundPatents={notFoundPatents}
        onPatentSearch={handleCorrectedPatentSearch}
        setNotFoundPatents={setNotFoundPatents}
      />
    </div>
  );
};

export default PatentSearch; 