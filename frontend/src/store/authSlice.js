import { createSlice } from '@reduxjs/toolkit';

const stored = (() => {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
})();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: stored.user,
    token: stored.token,
  },
  reducers: {
    setCredentials(state, action) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    clearCredentials(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
});

export const { setCredentials, clearCredentials, updateUser } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => !!state.auth.token;
export const selectUserTier = (state) => state.auth.user?.tier;
export const selectUserRole = (state) => state.auth.user?.role ?? 'user';
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';
