import { configureStore } from '@reduxjs/toolkit';
import patentReducer from './slices/patentSlice';
import authReducer from './slices/authSlice';
import savedPatentsReducer from './slices/savedPatentsSlice';

export const store = configureStore({
  reducer: {
    patents: patentReducer,
    auth: authReducer,
    savedPatents: savedPatentsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values that might be in our patent data
        ignoredActions: ['patents/setSearchResults', 'patents/setSelectedPatent', 'patents/setSmartSearchResults'],
        ignoredPaths: ['patents.searchResults', 'patents.selectedPatent', 'patents.smartSearchResults'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 