"use client";
import StoreProvider from "@/lib/store/store-provider";
import React from "react";
import ProtectedRoute from "./protectedRoute";

function Providers({ children }: any) {
  return (
    <StoreProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
    </StoreProvider>
  );
}

export default Providers;
