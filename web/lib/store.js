import { configureStore } from '@reduxjs/toolkit';
import connectionsReducer from './slices/connectionsSlice';
import whatsappReducer   from './slices/whatsappSlice';
import emailReducer      from './slices/emailSlice';

export const store = configureStore({
  reducer: {
    connections: connectionsReducer,
    whatsapp:    whatsappReducer,
    email:       emailReducer,
  },
  // Disable serializability check for socket-related non-serializable values
  // (we never store non-serializable data in Redux, but this silences the warning
  // for large message payloads during development)
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});
