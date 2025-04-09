import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { patentApi, normalizePatentResponse, ApiSource } from '../../api/patents';
import { detectApiType } from '../../Components/Patents/utils';

interface Patent {
  patentId: string;
  status: 'success' | 'error' | 'loading';
  title?: string;
  abstract?: string;
  initialFetch?: boolean;
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
  };
}

interface PatentState {
  selectedPatent: Patent | null;
  searchResults: Patent[];
  isLoading: boolean;
  error: string | null;
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

const initialState: PatentState = {
  selectedPatent: null,
  searchResults: [],
  isLoading: false,
  error: null,
  filters: {
    showGrantPatents: true,
    showApplicationPatents: true,
    filterByFamilyId: true,
    filteredPatents: null,
    filteredPatentIds: []
  },
  smartSearchResults: null,
};

// Async thunk for fetching full patent details
export const fetchFullPatentDetails = createAsyncThunk(
  'patents/fetchFullDetails',
  async ({ patentId, apiType }: { patentId: string; apiType: ApiSource }, { rejectWithValue, getState }) => {
    try {
      // Check if we already have the complete data in the state
      const state = getState() as any;
      const existingSelectedPatent = state.patents.selectedPatent;
      
      // If we already have this patent selected with all needed details, return it
      if (existingSelectedPatent && 
          existingSelectedPatent.patentId === patentId &&
          existingSelectedPatent.details && 
          existingSelectedPatent.details.description && 
          existingSelectedPatent.details.claims && 
          existingSelectedPatent.details.claims.length &&
          existingSelectedPatent.details.figures) {
        
        console.log('Using existing selected patent details from state, skipping API call:', patentId);
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
          existingPatent.details.claims.length &&
          existingPatent.details.figures) {
        
        console.log('Using existing patent details from state, skipping API call:', patentId);
        return existingPatent;
      }
      
      // If it's a SerpAPI patent ID, check for existing data
      if (apiType === 'serpapi') {
        // If we already have basic patent info but no details, fetch those
        if (existingPatent) {
          console.log('Fetching SerpAPI patent details:', patentId);
          const result = await patentApi.searchPatentsSerpApi(patentId);
          const normalizedResult = normalizePatentResponse(result, 'serpapi');
          
          if (!normalizedResult) {
            throw new Error('No data found for the provided patent ID');
          }
          
          return normalizedResult;
        }
      }
        
      // For Unified Patents API, fetch all required data in parallel
      console.log('Fetching Unified API patent details:', patentId);
      const [fullLanguageData, figuresData, patentData] = await Promise.all([
        patentApi.getFullLanguage(patentId),
        patentApi.getFigures(patentId),
        patentApi.searchPatentsUnified(patentId)
      ]);

      if (!patentData || !patentData._source) {
        throw new Error('Failed to fetch patent data');
      }

      // Transform claims data to match the expected format
      const formattedClaims = (fullLanguageData?.claims || []).map((claim: any) => ({
        description: claim.text || '',
        text: claim.text || '',
        ucid: claim.index || '',
        children: claim.children || []
      }));

      return {
        patentId,
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
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch patent details');
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
        console.log('SerpAPI search response:', result);
        
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
    },
    setSearchResults: (state, action: PayloadAction<Patent[]>) => {
      state.searchResults = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearState: (state) => {
      state.selectedPatent = null;
      state.searchResults = [];
      state.isLoading = false;
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<{
      showGrantPatents?: boolean;
      showApplicationPatents?: boolean;
      filterByFamilyId?: boolean;
      filteredPatents?: Patent[] | null;
      filteredPatentIds?: string[];
    }>) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },
    setSmartSearchResults: (state, action: PayloadAction<PatentState['smartSearchResults']>) => {
      state.smartSearchResults = action.payload;
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
        
        state.searchResults = patentArray;
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
  clearState,
  setFilters,
  setSmartSearchResults,
} = patentSlice.actions;

export default patentSlice.reducer; 