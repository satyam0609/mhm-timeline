"use client";

import { RNMessageData } from "@/types/global";
import { useEffect, useState, useCallback } from "react";

// type RNMessageData = {
//   [key: string]: any;
// };

declare global {
  interface Window {
    receiveFromReactNative?: (data: any) => void;
    updateFromReactNative?: (data: RNMessageData) => void;
    ReactNativeWebView?: {
      postMessage: (msg: string) => void;
    };
    initialData?: RNMessageData;
  }
}

/**
 * ✅ Hook for two-way communication between WebView and React Native
 */
export function useReactNativeBridge() {
  // ✅ Prevent running on server
  if (typeof window === "undefined")
    return { data: {}, sendToReactNative: () => {} };

  // ✅ Initialize state from injected initialData
  const initialStart = window.initialData?.data?.startDate
    ? new Date(window.initialData.data.startDate)
    : null;
  const initialEnd = window.initialData?.data?.endDate
    ? new Date(window.initialData?.data.endDate)
    : null;
  const initialSensor = window.initialData?.data?.sensorId || null;

  const [data, setData] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    sensorId: null | string;
  }>({
    startDate: initialStart,
    endDate: initialEnd,
    sensorId: initialSensor,
  });

  // ✅ Function to send data Web → React Native
  const sendToReactNative = useCallback((data: any) => {
    if (window.ReactNativeWebView?.postMessage) {
      const payload = { data };
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      console.log("📤 Sent to React Native:", payload);
    } else {
      console.warn("⚠️ ReactNativeWebView not found!");
    }
  }, []);

  // ✅ Listen for messages React Native → Web
  useEffect(() => {
    window.receiveFromReactNative = (incomingData: RNMessageData) => {
      console.log("✅ Received from React Native:", incomingData);

      const updatedData = { ...incomingData.data };

      if (incomingData.data.startDate)
        updatedData.startDate = new Date(incomingData.data.startDate);
      if (incomingData.data.endDate)
        updatedData.endDate = new Date(incomingData.data.endDate);
      if (incomingData.data.sensorId)
        updatedData.sensorId = incomingData.data.sensorId;

      setData((prev) => ({ ...prev, ...updatedData }));
    };

    return () => {
      delete window.receiveFromReactNative;
    };
  }, []);

  return { data, sendToReactNative };
}
