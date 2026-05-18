import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import onboardingReducer from './onboardingSlice';
import clinicalHistoryReducer from './clinicalHistorySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
    clinicalHistory: clinicalHistoryReducer,
  },
});

export default store;
