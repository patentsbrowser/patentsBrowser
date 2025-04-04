import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SavedPatent {
  patentId: string;
  title: string;
  abstract: string;
  savedAt: string;
}

interface SavedPatentsState {
  savedPatents: SavedPatent[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SavedPatentsState = {
  savedPatents: [],
  isLoading: false,
  error: null,
};

const savedPatentsSlice = createSlice({
  name: 'savedPatents',
  initialState,
  reducers: {
    setSavedPatents: (state, action: PayloadAction<SavedPatent[]>) => {
      state.savedPatents = action.payload;
    },
    addSavedPatent: (state, action: PayloadAction<SavedPatent>) => {
      state.savedPatents.push(action.payload);
    },
    removeSavedPatent: (state, action: PayloadAction<string>) => {
      state.savedPatents = state.savedPatents.filter(
        patent => patent.patentId !== action.payload
      );
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearState: (state) => {
      state.savedPatents = [];
      state.isLoading = false;
      state.error = null;
    },
  },
});

export const {
  setSavedPatents,
  addSavedPatent,
  removeSavedPatent,
  setLoading,
  setError,
  clearState,
} = savedPatentsSlice.actions;

export default savedPatentsSlice.reducer; 