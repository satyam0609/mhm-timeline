import { useEffect, useState, useCallback } from "react";

export type RNMessageData = {
  type: "action" | "data";
  data: any;
  action: string | null;
};

const toDateOrNull = (value: any) => (value ? new Date(value) : null);

export function useReactNativeBridge(actions: Record<string, Function> = {}) {
  const initialStart = window.initialDates?.startDate
    ? new Date(window.initialDates.startDate)
    : null;
  const initialEnd = window.initialDates?.endDate
    ? new Date(window.initialDates.endDate)
    : null;

  const [data, setData] = useState({
    startDate: initialStart,
    endDate: initialEnd,
    sensorId: null,
    selectedDays: 1,
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
      // console.log(payload);
      if (type === "data" && payload) {
        const updated: any = { ...payload };
        updated.startDate = toDateOrNull(payload.startDate);
        updated.endDate = toDateOrNull(payload.endDate);
        sendToReactNative("data", updated, "-------updated data");
        setData((prev) => ({ ...prev, ...updated }));
      }

      if (type === "action" && action) {
        console.log("⚡ Action from React Native:", action);

        const fn = actions[action];

        if (fn) {
          fn(payload); // 👈 pass data coming from RN
        } else {
          console.warn(`⚠️ No handler found for action: ${action}`);
        }
      }
    };

    return () => {
      delete window.receiveFromReactNative;
    };
  }, []);

  return { data, sendToReactNative };
}
