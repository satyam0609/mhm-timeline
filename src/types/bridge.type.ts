import type { RNMessageData } from "./global";

export type BridgeState = {
  startDate: Date | null;
  endDate: Date | null;
  sensorId: string | null;
  selectedDays: number;
  token: null | string;
};

export type ActionHandlers = Record<string, (data: any) => void>;

export type ReactNativeBridgeContextType = {
  data: BridgeState;
  isReady: boolean;
  sendToReactNative: (
    type: "action" | "data" | "ready",
    payloadData?: any,
    action?: string | null
  ) => void;
  registerActions: (handlers: ActionHandlers) => void;
};
