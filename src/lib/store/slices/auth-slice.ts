import { createSlice } from "@reduxjs/toolkit";

interface AuthState {
  token: string | null;
  isVerified: boolean;
}

const initialState: AuthState = {
  token: null,
  isVerified: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
    },
    setVerified: (state, action) => {
      state.isVerified = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.isVerified = false;
    },
  },
});

export const { setToken, setVerified, logout } = authSlice.actions;
export default authSlice.reducer;
