import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { patentApi, normalizePatentResponse, ApiSource } from '../../api/patents';
// import { detectApiType } from '../../Components/Patents/utils';
import { RootState } from '../../Redux/store';

// Define localStorage keys
const LOCAL_STORAGE_KEYS = {
  SEARCH_RESULTS: 'redux_patent_search_results',
  SELECTED_PATENT: 'redux_selected_patent',
  SMART_SEARCH_RESULTS: 'redux_smart_search_results',
  FILTERS: 'redux_patent_filters',
  VIEWED_PATENTS: 'viewed_patents'
};

interface Patent {
  patentId: string;
  status: 'success' | 'error' | 'loading';
  title?: string;
  abstract?: string;
  initialFetch?: boolean;
  description?: string;
  claims?: Array<{
    description: string;
    text: string;
    ucid: string;
    children: any[];
  }>;
  figures?: any[];
  familyMembers?: any[];
  details?: {
    grant_number?: string;
    expiration_date?: string;
    assignee_current?: string[];
    type?: string;
    num_cit_pat?: number;
    assignee_original?: string[];
    assignee_parent?: string[];
    priority_date?: string;
    publication_date?: string;
    grant_date?: string;
    application_date?: string;
    application_number?: string;
    publication_number?: string;
    publication_status?: string;
    publication_type?: string;
    country?: string;
    kind_code?: string;
    inventors?: string[];
    examiner?: string[];
    law_firm?: string;
    cpc_codes?: string[];
    uspc_codes?: string[];
    num_cit_npl?: number;
    num_cit_pat_forward?: number;
    citations_pat_forward?: string[];
    portfolio_score?: number;
    litigation_score?: number;
    rating_broadness?: string;
    rating_citation?: string;
    rating_litigation?: string;
    rating_validity?: string;
    family_id?: string;
    extended_family_id?: string;
    hyperlink_google?: string;
    is_litigated?: string;
    is_challenged?: string;
    num_litigated?: number;
    num_challenged?: number;
    last_litigated_at?: string | null;
    last_challenged_at?: string | null;
    family_annuities?: number;
    norm_family_annuities?: number;
    rnix_score?: number;
    // Add these fields to avoid type errors
    description?: string;
    claims?: Array<{
      description: string;
      text: string;
      ucid: string;
      children: any[];
    }>;
    figures?: any[];
    family_members?: any[];
  };
}

interface PatentState {
  selectedPatent: Patent | null;
  searchResults: Patent[];
  isLoading: boolean;
  error: string | null;
  viewedPatents: string[];
  filters: {
    showGrantPatents: boolean;
    showApplicationPatents: boolean;
    filterByFamilyId: boolean;
    filteredPatents: Patent[] | null;
    filteredPatentIds: string[];
  };
  smartSearchResults: {
    hits: {
      hits: Array<{
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
          citations_pat_forward: string[];
          cpc_codes: string[];
          expiration_date: string;
          extended_family_id: string;
          family_id: string;
          filing_date: string;
          grant_date: string | null;
          grant_number: string;
          hyperlink_google: string;
          inventors: string[];
          is_challenged: string;
          is_litigated: string;
          kind_code: string;
          last_challenged_at: string | null;
          last_litigated_at: string | null;
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
          rating_litigation: string | null;
          rating_validity: string;
          rnix_score: number;
          title: string;
          type: string;
          ucid_spif: string[];
        };
      }>;
      total: {
        value: number;
        relation: string;
      };
    };
    took: number;
    timed_out: boolean;
    _shards: {
      total: number;
      successful: number;
      skipped: number;
      failed: number;
    };
  } | null;
}

// Function to load state from localStorage
const loadStateFromLocalStorage = (): Partial<PatentState> => {
  try {
    const searchResults = localStorage.getItem(LOCAL_STORAGE_KEYS.SEARCH_RESULTS);
    const selectedPatent = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_PATENT);
    const smartSearchResults = localStorage.getItem(LOCAL_STORAGE_KEYS.SMART_SEARCH_RESULTS);
    const filters = localStorage.getItem(LOCAL_STORAGE_KEYS.FILTERS);
    const viewedPatents = localStorage.getItem(LOCAL_STORAGE_KEYS.VIEWED_PATENTS);
    
    return {
      searchResults: searchResults ? JSON.parse(searchResults) : [],
      selectedPatent: selectedPatent ? JSON.parse(selectedPatent) : null,
      smartSearchResults: smartSearchResults ? JSON.parse(smartSearchResults) : null,
      filters: filters ? JSON.parse(filters) : undefined,
      viewedPatents: viewedPatents ? JSON.parse(viewedPatents) : [],
    };
  } catch (error) {
    console.error('Error loading patent state from localStorage:', error);
    return {};
  }
};

// Load saved state
const savedState = loadStateFromLocalStorage();

const initialState: PatentState = {
  selectedPatent: savedState.selectedPatent || null,
  searchResults: savedState.searchResults || [],
  isLoading: false,
  error: null,
  viewedPatents: savedState.viewedPatents || [],
  filters: savedState.filters || {
    showGrantPatents: true,
    showApplicationPatents: true,
    filterByFamilyId: true,
    filteredPatents: null,
    filteredPatentIds: []
  },
  smartSearchResults: savedState.smartSearchResults || null,
};

// Async thunk for fetching full patent details
export const fetchFullPatentDetails = createAsyncThunk(
  'patents/fetchFullDetails',
  async ({ patentId, apiType }: { patentId: string; apiType: ApiSource }, { rejectWithValue, getState }) => {
    try {
      // Validate patentId before making any API calls
      if (!patentId || patentId.length < 4) {
        console.warn('Invalid or incomplete patent ID. Skipping API call for:', patentId);
        return rejectWithValue('Invalid or incomplete patent ID');
      }
    
      // Get the current state
      const state = getState() as RootState;
      
      // Check if we already have this patent selected with all details
      const existingSelectedPatent = state.patents.selectedPatent;
      
      // If we already have this patent with all needed details, return it
      if (existingSelectedPatent && 
          existingSelectedPatent.patentId === patentId && 
          existingSelectedPatent.details && 
          existingSelectedPatent.details.description && 
          existingSelectedPatent.details.claims && 
          existingSelectedPatent.details.claims.length) {
        
        return existingSelectedPatent;
      }
      
      // Check in searchResults array
      const existingPatent = state.patents.searchResults.find(
        (p: any) => p.patentId === patentId
      );
      
      // If we already have this patent with all needed details, return it
      if (existingPatent && 
          existingPatent.details && 
          existingPatent.details.description && 
          existingPatent.details.claims && 
          existingPatent.details.claims.length) {
        
        return existingPatent;
      }

      // For Unified Patents API, fetch all required data in parallel
      try {
        // First get the basic patent data
        const patentData = await patentApi.searchPatentsUnified(patentId);
        
        if (!patentData || !patentData._source) {
          throw new Error('Failed to fetch patent data');
        }

        // Then get the full language data
        const fullLanguageData = await patentApi.getFullLanguage(patentId);
        
        // Try to get figures data, but don't fail if it errors
        let figuresData = [];
        try {
          figuresData = await patentApi.getFigures(patentId);
        } catch (figuresError) {
          console.warn('Failed to fetch figures data:', figuresError);
          // Continue with empty figures array
        }

        // Transform claims data to match the expected format
        const formattedClaims = (fullLanguageData?.claims || []).map((claim: any) => ({
          description: claim.text || '',
          text: claim.text || '',
          ucid: claim.index || '',
          children: claim.children || []
        }));

        return {
          patentId, // Keep the original patentId in the response
          status: 'success' as const, // Use a const assertion to narrow the type
          title: patentData._source.title,
          abstract: patentData._source.abstract,
          description: fullLanguageData?.description || '',
          claims: formattedClaims,
          figures: figuresData || [],
          familyMembers: patentData._source.family_members || [],
          details: {
            grant_number: patentData._source.grant_number,
            expiration_date: patentData._source.expiration_date,
            assignee_current: patentData._source.assignee_current,
            type: patentData._source.type,
            num_cit_pat: patentData._source.num_cit_pat,
            description: fullLanguageData?.description || '',
            claims: formattedClaims,
            figures: figuresData || [],
            family_members: patentData._source.family_members || []
          }
        };
      } catch (apiError: any) {
        // Handle specific API errors
        if (apiError.response?.status === 500) {
          throw new Error(`Server error while fetching patent details. Please try again later.`);
        } else if (apiError.response?.status === 404) {
          throw new Error(`Patent details not found for ID: ${patentId}`);
        } else if (apiError.response?.data?.message) {
          throw new Error(apiError.response.data.message);
        } else {
          throw new Error(`Error fetching patent details: ${apiError.message}`);
        }
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch patent details');
    }
  }
);

// Async thunk for searching patents
export const searchPatents = createAsyncThunk(
  'patents/search',
  async ({ query, api }: { query: string; api: 'serpapi' | 'unified' }, { rejectWithValue }) => {
    try {
      let result;
      
      if (api === 'serpapi') {
        result = await patentApi.searchPatentsSerpApi(query);
        // Normalize the result
        const normalizedResult = normalizePatentResponse(result.data || result, 'serpapi');
        if (!normalizedResult) {
          throw new Error('No data found for the provided patent ID');
        }
        
        return normalizedResult;
      } else {
        // Unified API
        result = await patentApi.searchPatentsUnified(query);
        
        if (!result || !result._source) {
          throw new Error('No data found for the provided patent ID');
        }
        
        // Normalize the result
        const normalizedResult = normalizePatentResponse(result, 'unified');
        if (!normalizedResult) {
          throw new Error('No data found for the provided patent ID');
        }
        
        return normalizedResult;
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'An error occurred while searching');
    }
  }
);

const patentSlice = createSlice({
  name: 'patents',
  initialState,
  reducers: {
    setSelectedPatent: (state, action: PayloadAction<Patent | null>) => {
      state.selectedPatent = action.payload;
      // Save to localStorage
      if (action.payload) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_PATENT, JSON.stringify(action.payload));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_PATENT);
      }
    },
    setSearchResults: (state, action: PayloadAction<Patent[]>) => {
      state.searchResults = action.payload;
      state.isLoading = false;
      state.error = null;
      // Save to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEYS.SEARCH_RESULTS, JSON.stringify(action.payload));
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearPatentState: (state) => {
      state.searchResults = [];
      state.selectedPatent = null;
      state.smartSearchResults = null;
      // Reset filters to default values
      state.filters = {
        showGrantPatents: true,
        showApplicationPatents: true,
        filterByFamilyId: true,
        filteredPatents: null,
        filteredPatentIds: []
      };
      // Don't clear viewed patents when clearing other state
      
      // Clear localStorage
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SEARCH_RESULTS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_PATENT);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SMART_SEARCH_RESULTS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.FILTERS);
      // Don't remove viewed patents from localStorage
    },
    setFilters: (state, action: PayloadAction<Partial<PatentState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Save to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEYS.FILTERS, JSON.stringify(state.filters));
    },
    setSmartSearchResults: (state, action: PayloadAction<PatentState['smartSearchResults']>) => {
      state.smartSearchResults = action.payload;
      // Save to localStorage
      if (action.payload) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SMART_SEARCH_RESULTS, JSON.stringify(action.payload));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SMART_SEARCH_RESULTS);
      }
    },
    markPatentAsViewed: (state, action: PayloadAction<string>) => {
      const patentId = action.payload;
      if (!state.viewedPatents.includes(patentId)) {
        state.viewedPatents.push(patentId);
        
        // Save to localStorage
        localStorage.setItem(LOCAL_STORAGE_KEYS.VIEWED_PATENTS, JSON.stringify(state.viewedPatents));
      }
    },
    resetViewedStatus: (state, action: PayloadAction<string[]>) => {
      // Remove specified patents from viewed list
      const patentIdsToReset = action.payload;
      state.viewedPatents = state.viewedPatents.filter(
        id => !patentIdsToReset.includes(id)
      );
      
      // Update localStorage
      localStorage.setItem(LOCAL_STORAGE_KEYS.VIEWED_PATENTS, JSON.stringify(state.viewedPatents));
    },
    clearViewedPatents: (state) => {
      state.viewedPatents = [];
      localStorage.removeItem(LOCAL_STORAGE_KEYS.VIEWED_PATENTS);
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetch patent details pending
      .addCase(fetchFullPatentDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // Handle fetch patent details fulfilled
      .addCase(fetchFullPatentDetails.fulfilled, (state, action: PayloadAction<Patent>) => {
        state.isLoading = false;
        
        // If we have a selectedPatent, merge the new details with the existing ones
        if (state.selectedPatent && state.selectedPatent.patentId === action.payload.patentId) {
          state.selectedPatent = {
            ...state.selectedPatent,
            ...action.payload,
            details: {
              ...state.selectedPatent.details,
              ...action.payload.details
            },
            // Mark that this patent has been fully fetched
            initialFetch: true
          };
        } else {
          // Otherwise set the new patent as selected
          state.selectedPatent = {
            ...action.payload,
            initialFetch: true
          };
        }
        
        // Also update in the searchResults array if present
        const index = state.searchResults.findIndex(p => p.patentId === action.payload.patentId);
        if (index !== -1) {
          state.searchResults[index] = {
            ...state.searchResults[index],
            ...action.payload,
            details: {
              ...state.searchResults[index].details,
              ...action.payload.details
            },
            initialFetch: true
          };
        }
        
        // Also update in the filteredPatents array if present
        if (state.filters.filteredPatents) {
          const filteredIndex = state.filters.filteredPatents.findIndex(p => p.patentId === action.payload.patentId);
          if (filteredIndex !== -1) {
            state.filters.filteredPatents[filteredIndex] = {
              ...state.filters.filteredPatents[filteredIndex],
              ...action.payload,
              details: {
                ...state.filters.filteredPatents[filteredIndex].details,
                ...action.payload.details
              },
              initialFetch: true
            };
          }
        }
      })
      // Handle fetch patent details rejected
      .addCase(fetchFullPatentDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch patent details';
      })
      // Handle search patents pending
      .addCase(searchPatents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // Handle search patents fulfilled - update to handle normalized response
      .addCase(searchPatents.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Convert the normalized result to an array if it's not already
        const patentData = action.payload;
        const patentArray = Array.isArray(patentData) ? patentData : [patentData];
        
        // Add status for each patent if missing
        const patentArrayWithStatus = patentArray.map(patent => ({
          ...patent,
          status: patent.status || 'success' as 'success' | 'error' | 'loading'
        }));
        
        state.searchResults = patentArrayWithStatus;
      })
      // Handle search patents rejected
      .addCase(searchPatents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to search patents';
      });
  },
});

export const {
  setSelectedPatent,
  setSearchResults,
  setLoading,
  setError,
  clearPatentState,
  setFilters,
  setSmartSearchResults,
  markPatentAsViewed,
  resetViewedStatus,
  clearViewedPatents,
} = patentSlice.actions;

export default patentSlice.reducer; 