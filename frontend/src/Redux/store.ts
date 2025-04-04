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
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 