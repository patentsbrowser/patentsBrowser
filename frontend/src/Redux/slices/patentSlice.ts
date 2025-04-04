import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { patentApi, normalizePatentResponse, ApiSource } from '../../api/patents';
import { detectApiType } from '../../Components/Patents/utils';

interface Patent {
  patentId: string;
  title?: string;
  abstract?: string;
  description?: string;
  claims?: any[];
  figures?: any[];
  familyMembers?: any[];
  details?: {
    grant_number?: string;
    expiration_date?: string;
    assignee_current?: string[];
    type?: string;
    num_cit_pat?: number;
  };
}

interface PatentState {
  selectedPatent: Patent | null;
  searchResults: Patent[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PatentState = {
  selectedPatent: null,
  searchResults: [],
  isLoading: false,
  error: null,
};

// Async thunk for fetching full patent details
export const fetchFullPatentDetails = createAsyncThunk(
  'patents/fetchFullDetails',
  async (patentId: string, { rejectWithValue, getState }) => {
    try {
      // Detect API type based on patent ID format
      const apiType = detectApiType(patentId);
      
      // If it's a SerpAPI patent ID, check if we already have it in the state
      if (apiType === 'serpapi') {
        const state = getState() as any;
        const existingPatent = state.patents.searchResults.find(
          (p: any) => p.patentId === patentId
        );
        
        // If we already have this patent with all needed details, return it
        if (existingPatent && 
            existingPatent.details && 
            (existingPatent.details.description || 
             existingPatent.details.claims || 
             existingPatent.details.figures)) {
          
          console.log('Using existing patent details from state, skipping API call:', patentId);
          return existingPatent;
        }
        
        // Otherwise, fetch it from the API
        console.log('Fetching SerpAPI patent details:', patentId);
        const result = await patentApi.searchPatentsSerpApi(patentId);
        const normalizedResult = normalizePatentResponse(result, 'serpapi');
        
        if (!normalizedResult) {
          throw new Error('No data found for the provided patent ID');
        }
        
        return normalizedResult;
      } else {
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
            num_cit_pat: patentData._source.num_cit_pat
          }
        };
      }
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
        state.selectedPatent = action.payload;
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
} = patentSlice.actions;

export default patentSlice.reducer; 