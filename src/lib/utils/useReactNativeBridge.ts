// import { useEffect, useState, useCallback } from "react";

// export type RNMessageData = {
//   type: "action" | "data" | "ready";
//   data: any;
//   action: string | null;
// };

// const toDateOrNull = (value: any) => (value ? new Date(value) : null);

// export function useReactNativeBridge(actions: Record<string, Function> = {}) {
//   const initialStart = window.initialDataFromRN?.startDate
//     ? new Date(window.initialDataFromRN.startDate)
//     : null;
//   const initialEnd = window.initialDataFromRN?.endDate
//     ? new Date(window.initialDataFromRN.endDate)
//     : null;
//   const initialSensorId = window.initialDataFromRN?.sensorId
//     ? new Date(window.initialDataFromRN.sensorId)
//     : null;

//   const [data, setData] = useState({
//     startDate: initialStart,
//     endDate: initialEnd,
//     sensorId: initialSensorId,
//     selectedDays: 1,
//   });

//   const sendToReactNative = useCallback(
//     (
//       type: "action" | "data" | "ready",
//       payloadData: any = null,
//       action: string | null = null
//     ) => {
//       if (window.ReactNativeWebView?.postMessage) {
//         const payload: RNMessageData = { type, data: payloadData, action };
//         window.ReactNativeWebView.postMessage(JSON.stringify(payload));
//         console.log("📤 Sent to React Native:", payload);
//       } else {
//         console.warn("⚠️ ReactNativeWebView not available");
//       }
//     },
//     []
//   );

//   useEffect(() => {
//     // 👇 Safe cast to your local RNMessageData type
//     window.receiveFromReactNative = (incoming: any) => {
//       const msg = incoming as RNMessageData;
//       console.log("✅ Received from React Native:", msg);

//       const { type, data: payload, action } = msg;
//       // console.log(payload);
//       if (type === "data" && payload) {
//         const updated: any = { ...payload };
//         updated.startDate = toDateOrNull(payload.startDate);
//         updated.endDate = toDateOrNull(payload.endDate);
//         sendToReactNative("data", updated, "-------updated data");
//         // setData((prev) => ({ ...prev, ...updated }));
//         setData(updated);
//         sendToReactNative("data", updated, "-------get updated updated data");
//       }

//       if (type === "action" && action) {
//         console.log("⚡ Action from React Native:", action);

//         const fn = actions[action];

//         if (fn) {
//           fn(payload); // 👈 pass data coming from RN
//         } else {
//           console.warn(`⚠️ No handler found for action: ${action}`);
//         }
//       }
//     };

//     return () => {
//       delete window.receiveFromReactNative;
//     };
//   }, []);

//   return { data, sendToReactNative };
// }

// ============================================
// FILE 2: useReactNativeBridge.ts
// ============================================
import { useEffect, useState, useCallback, useRef } from "react";
import type { RNMessageData } from "@/types/global";

type BridgeState = {
  startDate: Date | null;
  endDate: Date | null;
  sensorId: string | null;
  selectedDays: number;
};

type ActionHandlers = Record<string, (data: any) => void>;

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

export function useReactNativeBridge(actionHandlers: ActionHandlers = {}) {
  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState<BridgeState>({
    startDate: null,
    endDate: null,
    sensorId: null,
    selectedDays: 1,
  });

  const isReadySentRef = useRef(false);

  // Send message to React Native
  const sendToReactNative = useCallback(
    (
      type: "action" | "data" | "ready",
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

  // Initialize with data injected before load
  useEffect(() => {
    if (window.initialDataFromRN) {
      const initial = window.initialDataFromRN;
      const initialState: BridgeState = {
        startDate: toDateOrNull(initial.startDate),
        endDate: toDateOrNull(initial.endDate),
        sensorId: initial.sensorId || null,
        selectedDays: initial.selectedDays || 1,
      };
      setData(initialState);
      console.log("🔵 Loaded initial data from RN:", initialState);
    }
  }, []);

  // Set up message listener
  useEffect(() => {
    window.receiveFromReactNative = (incoming: RNMessageData) => {
      console.log("✅ Received from React Native:", incoming);

      const { type, data: payload, action } = incoming;

      if (type === "data" && payload) {
        const updated: BridgeState = {
          startDate: toDateOrNull(payload.startDate),
          endDate: toDateOrNull(payload.endDate),
          sensorId: payload.sensorId || null,
          selectedDays: payload.selectedDays || 1,
        };
        setData(updated);
        console.log("📊 Updated data state:", updated);
      }

      if (type === "action" && action) {
        console.log("⚡ Action from React Native:", action);
        const handler = actionHandlers[action];

        if (handler) {
          handler(payload);
        } else {
          console.warn(`⚠️ No handler found for action: ${action}`);
        }
      }
    };

    return () => {
      delete window.receiveFromReactNative;
    };
  }, [actionHandlers]);

  // Send ready signal when component mounts
  useEffect(() => {
    if (!isReadySentRef.current) {
      sendToReactNative("ready", { timestamp: new Date().toISOString() });
      setIsReady(true);
      isReadySentRef.current = true;
      console.log("🟢 WebView ready signal sent");
    }
  }, [sendToReactNative]);

  return {
    data,
    isReady,
    sendToReactNative,
  };
}
