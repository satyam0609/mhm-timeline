// store/bridgeSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface BridgeState {
  isReadySent: boolean;
}

const initialState: BridgeState = {
  isReadySent: false,
};

const bridgeSlice = createSlice({
  name: "bridge",
  initialState,
  reducers: {
    markReadySent(state) {
      state.isReadySent = true;
    },
    resetReady(state) {
      state.isReadySent = false;
    },
  },
});

export const { markReadySent, resetReady } = bridgeSlice.actions;
export default bridgeSlice.reducer;
