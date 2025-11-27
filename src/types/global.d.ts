// global.d.ts

export type RNMessageData = {
  type: "action" | "data" | "ready";
  data: any;
  action: string | null;
};

export type InitialData = {
  startDate: string;
  endDate: string;
  sensorId: string;
  selectedDays: number;
};

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (msg: string) => void;
    };
    receiveFromReactNative?: (data: RNMessageData) => void;
    initialDataFromRN?: InitialData;
  }
}

export {};
