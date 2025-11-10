export type RNMessageData = {
  type: "action" | "data";
  data: any;
  action: string | null;
};

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (msg: string) => void;
    };
    receiveFromReactNative?: (data: any) => void;
    initialDates?: { startDate: string; endDate: string };
  }
}

export {};
