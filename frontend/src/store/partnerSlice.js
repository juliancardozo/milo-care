import { createSlice } from '@reduxjs/toolkit';

// Branding white-label resuelto por slug. Sin partner → branding Milo Care default.
const DEFAULT_BRANDING = {
  appName: 'Milo Care',
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
};

const partnerSlice = createSlice({
  name: 'partner',
  initialState: {
    slug: null,
    type: null,
    branding: DEFAULT_BRANDING,
    // 'idle' | 'loading' | 'resolved' | 'default'
    status: 'idle',
  },
  reducers: {
    partnerLoading(state, action) {
      state.status = 'loading';
      state.slug = action.payload || null;
    },
    partnerResolved(state, action) {
      const { slug, type, branding } = action.payload;
      state.slug = slug;
      state.type = type || null;
      state.branding = { ...DEFAULT_BRANDING, ...(branding || {}) };
      state.status = 'resolved';
    },
    partnerDefault(state) {
      state.slug = null;
      state.type = null;
      state.branding = DEFAULT_BRANDING;
      state.status = 'default';
    },
  },
});

export const { partnerLoading, partnerResolved, partnerDefault } = partnerSlice.actions;

export const selectPartner = (s) => s.partner;
export const selectBranding = (s) => s.partner.branding;
export const selectAppName = (s) => s.partner.branding.appName || 'Milo Care';

export default partnerSlice.reducer;
