"use client";
import { useEffect, useState, useCallback } from "react";

type RNMessageData = {
  [key: string]: any;
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
 * Hook for two-way communication between WebView and React Native
 */
export function useReactNativeBridge() {
  // Initialize state from injected initialDates
  if (!window) return {};
  const initialStart = window.initialDates?.startDate
    ? new Date(window.initialDates.startDate)
    : null;
  const initialEnd = window.initialDates?.endDate
    ? new Date(window.initialDates.endDate)
    : null;

  const [data, setData] = useState<RNMessageData>({
    startDate: initialStart,
    endDate: initialEnd,
  });

  // Generic function to send key/value to React Native
  const sendToReactNative = useCallback((key: string, value: any) => {
    if (window.ReactNativeWebView?.postMessage) {
      const payload: RNMessageData = { [key]: value };
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      console.log("📤 Sent to React Native:", payload);
    }
  }, []);

  // Receive updates from React Native
  useEffect(() => {
    window.receiveFromReactNative = (incomingData: RNMessageData) => {
      console.log("✅ Received from React Native:", incomingData);

      // Convert startDate/endDate strings to Date if needed
      const updatedData: RNMessageData = { ...incomingData };
      if (incomingData.startDate)
        updatedData.startDate = new Date(incomingData.startDate);
      if (incomingData.endDate)
        updatedData.endDate = new Date(incomingData.endDate);

      setData((prev) => ({ ...prev, ...updatedData }));
    };

    return () => {
      delete window.receiveFromReactNative;
    };
  }, []);

  // // Automatically send startDate and endDate if changed
  // useEffect(() => {
  //   if (data.startDate) sendToReactNative("startDate", data.startDate.toISOString());
  //   if (data.endDate) sendToReactNative("endDate", data.endDate.toISOString());
  // }, [data.startDate, data.endDate, sendToReactNative]);

  return { data, sendToReactNative };
}

// import { useEffect, useState } from "react";

// type RNMessageData = {
//   startDate: string | Date;
//   endDate: string | Date;
// };

// declare global {
//   interface Window {
//     receiveFromReactNative?: (data: RNMessageData) => void;
//     initialDates?: { startDate: string; endDate: string };
//   }
// }

// export function useReactNativeBridge() {
//   // ✅ Initialize state from injected initialDates if available
//   const initialStart = window.initialDates?.startDate
//     ? new Date(window.initialDates.startDate)
//     : new Date();
//   const initialEnd = window.initialDates?.endDate
//     ? new Date(window.initialDates.endDate)
//     : new Date();

//   const [startDate, setStartDate] = useState<Date>(initialStart);
//   const [endDate, setEndDate] = useState<Date>(initialEnd);

//   useEffect(() => {
//     console.log("🟡 React Native Bridge mounted");

//     window.receiveFromReactNative = (data: RNMessageData) => {
//       console.log("✅ Received from React Native:", data);

//       const newStart = new Date(data.startDate);
//       const newEnd = new Date(data.endDate);

//       if (!isNaN(newStart.getTime())) setStartDate(newStart);
//       if (!isNaN(newEnd.getTime())) setEndDate(newEnd);
//     };

//     return () => {
//       console.log("🔴 Cleaning up React Native Bridge listener");
//       delete window.receiveFromReactNative;
//     };
//   }, []);

//   // Optional: watch for state changes
//   useEffect(() => {
//     console.log("🔁 Timeline state updated:", { startDate, endDate });
//   }, [startDate, endDate]);

//   return { startDate, endDate };
// }
