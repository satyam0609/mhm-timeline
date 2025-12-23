"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import type { RNMessageData } from "@/types/global";
import { useDispatch, useSelector } from "react-redux";
import { markReadySent } from "../store/slices/bridge-slice";

/* ---------------------------------- */
/* Types                              */
/* ---------------------------------- */

export type BridgeState = {
  startDate: Date | null;
  endDate: Date | null;
  sensorId: string | null;
  selectedDays: number;
};

type Handler = (data: any) => void;

type BridgeContextType = {
  data: BridgeState;
  isReady: boolean;
  sendToReactNative: (
    type: "action" | "data" | "ready",
    payload?: any,
    action?: string | null
  ) => void;
  registerHandler: (action: string, handler: Handler) => void;
  unregisterHandler: (action: string) => void;
};

/* ---------------------------------- */
/* Helpers                            */
/* ---------------------------------- */

const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const getInitialBridgeState = (): BridgeState => {
  const initial = (window as any).initialDataFromRN;

  if (!initial) {
    return {
      startDate: null,
      endDate: null,
      sensorId: null,
      selectedDays: 1,
    };
  }

  return {
    startDate: toDateOrNull(initial.startDate),
    endDate: toDateOrNull(initial.endDate),
    sensorId: initial.sensorId ?? null,
    selectedDays: initial.selectedDays ?? 1,
  };
};

/* ---------------------------------- */
/* Context                            */
/* ---------------------------------- */

const BridgeContext = createContext<BridgeContextType | null>(null);

/* ---------------------------------- */
/* Provider                           */
/* ---------------------------------- */

export function ReactNativeBridgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const handlersRef = useRef<Record<string, Handler>>({});

  const [data, setData] = useState<BridgeState>(() => getInitialBridgeState());
  const [isReady, setIsReady] = useState(false);
  const dispatch = useDispatch();
  const isReadySent = useSelector((state: any) => state.bridge.isReadySent);

  /* ---------- Send to RN ---------- */

  const sendToReactNative = useCallback(
    (
      type: "action" | "data" | "ready",
      payload?: any,
      action?: string | null
    ) => {
      if (!window.ReactNativeWebView?.postMessage) {
        console.warn("ReactNativeWebView not available");
        return;
      }

      const message: RNMessageData = {
        type,
        data: payload ?? null,
        action: action ?? null,
      };

      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    },
    []
  );

  /* ---------- Receive from RN ---------- */

  useEffect(() => {
    window.receiveFromReactNative = (msg: RNMessageData) => {
      sendToReactNative(
        "data",
        msg,
        "=================new msg received=========================="
      );
      const { type, data: payload, action } = msg;

      if (type === "data" && payload) {
        const updated: BridgeState = {
          startDate: toDateOrNull(payload.startDate),
          endDate: toDateOrNull(payload.endDate),
          sensorId: payload.sensorId ?? null,
          selectedDays: payload.selectedDays ?? 1,
        };

        setData(updated);
      }

      if (type === "action" && action) {
        const handler = handlersRef.current[action];
        if (handler) handler(payload);
        else console.warn(`No handler registered for action: ${action}`);
      }
    };

    return () => {
      delete (window as any).receiveFromReactNative;
    };
  }, []);

  /* ---------- Ready handshake (ONCE) ---------- */

  //   useEffect(() => {
  //     if ((window as any).__RN_BRIDGE_READY__) return;

  //     sendToReactNative(
  //       "ready",
  //       {
  //         timestamp: new Date().toISOString(),
  //       },
  //       "once send"
  //     );

  //     (window as any).__RN_BRIDGE_READY__ = true;
  //     setIsReady(true);
  //   }, [sendToReactNative]);
  useEffect(() => {
    if (isReadySent) return; // Already sent
    sendToReactNative(
      "ready",
      { timestamp: new Date().toISOString() },
      "once send"
    );
    dispatch(markReadySent());
  }, [isReadySent, sendToReactNative, dispatch]);

  /* ---------- Handler registration ---------- */

  const registerHandler = useCallback((action: string, handler: Handler) => {
    handlersRef.current[action] = handler;
  }, []);

  const unregisterHandler = useCallback((action: string) => {
    delete handlersRef.current[action];
  }, []);

  /* ---------- Provider ---------- */

  return (
    <BridgeContext.Provider
      value={{
        data,
        isReady,
        sendToReactNative,
        registerHandler,
        unregisterHandler,
      }}
    >
      {children}
    </BridgeContext.Provider>
  );
}

/* ---------------------------------- */
/* Consumer Hook                      */
/* ---------------------------------- */

export function useRNBridge() {
  const ctx = useContext(BridgeContext);
  if (!ctx) {
    throw new Error(
      "useRNBridge must be used inside ReactNativeBridgeProvider"
    );
  }
  return ctx;
}
