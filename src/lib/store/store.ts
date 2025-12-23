import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
// import storage from "redux-persist/lib/storage";
import authSlice from "./slices/auth-slice";
import bridgeSlice from "./slices/bridge-slice";
import storage from "./custom-storage";

const combineReducer = combineReducers({
  auth: authSlice,
  bridge: bridgeSlice,
});

const isClient = typeof window !== "undefined";

const persistConfig = {
  key: "noop-storage",
  storage: storage,
  whiteList: ["bridge"],
};

const persistedReducer = persistReducer(persistConfig, combineReducer);
export const makeStore = () => {
  return configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
