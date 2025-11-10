"use client";
import { useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "./store";
import { PersistGate } from "redux-persist/integration/react";
import { persistStore } from "redux-persist";
import { storeInit } from "../apis/apiConnector";

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [persistor, setPersistor] = useState<any>(null);
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
  }

  useEffect(() => {
    setPersistor(persistStore(storeRef.current!));
    storeInit(storeRef.current!);
  }, []);

  if (!persistor) return null;
  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
