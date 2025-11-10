import { useEffect, useState, useCallback } from "react";

export type RNMessageData = {
  type: "action" | "data";
  data: any;
  action: string | null;
};

declare global {
  interface Window {
    receiveFromReactNative?: (data: RNMessageData) => void;
    ReactNativeWebView?: {
      postMessage: (msg: string) => void;
    };
    initialDates?: { startDate: string; endDate: string };
  }
}

/**
 * ✅ Hook for two-way communication between WebView and React Native
 */
export function useReactNativeBridge() {
  // Initialize from injected variables (if any)
  const initialStart = window.initialDates?.startDate
    ? new Date(window.initialDates.startDate)
    : null;
  const initialEnd = window.initialDates?.endDate
    ? new Date(window.initialDates.endDate)
    : null;

  const [data, setData] = useState({
    startDate: initialStart,
    endDate: initialEnd,
  });

  /**
   * ✅ Function to send structured message to React Native
   */
  const sendToReactNative = useCallback(
    (
      type: "action" | "data",
      payloadData: any = null,
      action: string | null = null
    ) => {
      if (window.ReactNativeWebView?.postMessage) {
        const payload: RNMessageData = { type, data: payloadData, action };
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        console.log("📤 Sent to React Native:", payload);
      } else {
        console.warn("⚠️ ReactNativeWebView not available");
      }
    },
    []
  );

  /**
   * ✅ Receive data or actions from React Native
   */
  useEffect(() => {
    window.receiveFromReactNative = (incoming: RNMessageData) => {
      console.log("✅ Received from React Native:", incoming);

      const { type, data: payload, action } = incoming;

      if (type === "data" && payload) {
        // Convert dates if present
        const updatedData: any = { ...payload };
        if (payload.startDate)
          updatedData.startDate = new Date(payload.startDate);
        if (payload.endDate) updatedData.endDate = new Date(payload.endDate);

        setData((prev) => ({ ...prev, ...updatedData }));
      }

      if (type === "action" && action) {
        console.log("⚡ Received Action:", action);
        // Handle custom actions if you need (like UI triggers)
      }
    };

    return () => {
      delete window.receiveFromReactNative;
    };
  }, []);

  return { data, sendToReactNative };
}
