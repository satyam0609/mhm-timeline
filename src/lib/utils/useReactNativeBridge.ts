import { useEffect, useState, useCallback } from "react";

export type RNMessageData = {
  type: "action" | "data";
  data: any;
  action: string | null;
};

export function useReactNativeBridge() {
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

  useEffect(() => {
    // 👇 Safe cast to your local RNMessageData type
    window.receiveFromReactNative = (incoming: any) => {
      const msg = incoming as RNMessageData;
      console.log("✅ Received from React Native:", msg);

      const { type, data: payload, action } = msg;

      if (type === "data" && payload) {
        const updated: any = { ...payload };
        if (payload.startDate) updated.startDate = new Date(payload.startDate);
        if (payload.endDate) updated.endDate = new Date(payload.endDate);
        setData((prev) => ({ ...prev, ...updated }));
      }

      if (type === "action" && action) {
        console.log("⚡ Action from React Native:", action);
      }
    };

    return () => {
      delete window.receiveFromReactNative;
    };
  }, []);

  return { data, sendToReactNative };
}
