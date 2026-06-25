import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import onboardingReducer from './onboardingSlice';
import clinicalHistoryReducer from './clinicalHistorySlice';
import partnerReducer from './partnerSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
    clinicalHistory: clinicalHistoryReducer,
    partner: partnerReducer,
  },
});

export default store;
