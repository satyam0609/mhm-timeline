import { createContext } from "react";
import type { ReactNativeBridgeContextType } from "@/types/bridge.type";

export const ReactNativeBridgeContext =
  createContext<ReactNativeBridgeContextType | null>(null);
