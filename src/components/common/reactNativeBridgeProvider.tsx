"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
  useContext,
} from "react";
import type { RNMessageData } from "@/types/global";
import { useAppDispatch } from "@/lib/hooks/useRedux";
import { BridgeState, ActionHandlers } from "@/types/bridge.type";
import { ReactNativeBridgeContext } from "@/context/reactNativeBridgeContext";

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export function ReactNativeBridgeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();

  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState<BridgeState>({
    token: null,
    startDate: null,
    endDate: null,
    sensorId: null,
    selectedDays: 1,
  });

  const actionHandlersRef = useRef<ActionHandlers>({});

  // ✅ Send to RN - STABLE
  const sendToReactNative = useCallback(
    (
      type: "action" | "data" | "ready" | "ack",
      payloadData: any = null,
      action: string | null = null,
    ) => {
      if (window.ReactNativeWebView?.postMessage) {
        const payload: RNMessageData = { type, data: payloadData, action };
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        console.log("📤 Sent to React Native:", { type, action });
      } else {
        console.warn("⚠️ ReactNativeWebView not available");
      }
    },
    [],
  );

  // ✅ Register actions dynamically
  const registerActions = useCallback((handlers: ActionHandlers) => {
    actionHandlersRef.current = {
      ...actionHandlersRef.current,
      ...handlers,
    };
    console.log("✅ Actions registered:", Object.keys(handlers));
  }, []);

  // ✅ Load initial injected data - ONCE
  useEffect(() => {
    if (window.initialDataFromRN) {
      const initial = window.initialDataFromRN;
      setData({
        token: initial.token ?? null,
        startDate: toDateOrNull(initial.startDate),
        endDate: toDateOrNull(initial.endDate),
        sensorId: initial.sensorId || null,
        selectedDays: initial.selectedDays || 1,
      });
      console.log("✅ Initial data loaded from RN");
    }
  }, []);

  // ✅ Setup message bridge - ONCE
  useEffect(() => {
    // Message handler - STABLE
    const handleMessage = (incoming: any) => {
      try {
        const msg = incoming as RNMessageData;
        const { type, data: payload, action } = msg;

        console.log("📥 Received from RN:", { type, action });

        // 🟢 TOKEN / INIT
        if (type === "token" && payload) {
          sendToReactNative("ack", { status: "success", type: "token" });

          const updated = {
            ...payload,
            startDate: toDateOrNull(payload.startDate),
            endDate: toDateOrNull(payload.endDate),
          };

          setData((prev) => {
            const newData = { ...prev, ...updated };
            console.log("✅ Token data set:", newData);
            return newData;
          });
          setIsReady(true);
        }

        // 🟢 DATA UPDATES - NO RELOADS
        if (type === "data" && payload) {
          console.log("🔄 BEFORE data update:", payload);

          sendToReactNative("ack", { status: "success", type: "data" });

          const updated = {
            ...payload,
            startDate: toDateOrNull(payload.startDate),
            endDate: toDateOrNull(payload.endDate),
          };

          setData((prev) => {
            const newData = { ...prev, ...updated };
            console.log("🔄 AFTER data update:", newData);
            return newData;
          });
        }

        // 🟢 ACTIONS
        if (type === "action" && action) {
          console.log("⚡ Action from React Native:", action);

          const fn = actionHandlersRef.current[action];
          if (fn) {
            fn(payload);
            sendToReactNative("ack", { status: "success", action });
          } else {
            console.warn(`⚠️ No handler for action: ${action}`);
            sendToReactNative("ack", {
              status: "error",
              action,
              error: "Handler not found",
            });
          }
        }
      } catch (err) {
        console.error("❌ Error processing RN message:", err);
      }
    };

    // Setup global handler
    window.receiveFromReactNative = handleMessage;

    // Setup event listeners for Android/iOS
    const messageHandler = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (window.receiveFromReactNative) {
          window.receiveFromReactNative(data);
        }
      } catch (err) {
        console.error("❌ Failed to parse RN message", err);
      }
    };

    // document.addEventListener("message", messageHandler);
    window.addEventListener("message", messageHandler);

    // Send initial ready signal
    const readyTimer = setTimeout(() => {
      sendToReactNative("ready", {
        timestamp: new Date().toISOString(),
        version: "2.0",
      });
      console.log("🟢 WebView ready signal sent");
    }, 100);

    return () => {
      // Cleanup
      clearTimeout(readyTimer);
      delete window.receiveFromReactNative;
      // document.removeEventListener("message", messageHandler);
      window.removeEventListener("message", messageHandler);
    };
  }, [sendToReactNative]); // Only sendToReactNative - stable

  return (
    <ReactNativeBridgeContext.Provider
      value={{
        data,
        isReady,
        sendToReactNative,
        registerActions,
      }}
    >
      {children}
    </ReactNativeBridgeContext.Provider>
  );
}

export function useReactNativeBridge() {
  const ctx = useContext(ReactNativeBridgeContext);

  if (!ctx) {
    throw new Error(
      "useReactNativeBridge must be used inside ReactNativeBridgeProvider",
    );
  }

  return ctx;
}
