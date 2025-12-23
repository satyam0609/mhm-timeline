"use client";
import StoreProvider from "@/lib/store/store-provider";
import React from "react";
import ProtectedRoute from "./protectedRoute";
import { ReactNativeBridgeProvider } from "@/lib/context/bridgeContext";

function Providers({ children }: any) {
  return (
    <StoreProvider>
      <ReactNativeBridgeProvider>
        <ProtectedRoute>{children}</ProtectedRoute>
      </ReactNativeBridgeProvider>
    </StoreProvider>
  );
}

export default Providers;
