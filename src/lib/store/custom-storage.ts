"use client";

import createWebStorage from "redux-persist/lib/storage/createWebStorage";

interface NoopStorage {
  getItem: (_key: string) => Promise<string | null>;
  setItem: (_key: string, value: string) => Promise<void>;
  removeItem: (_key: string) => Promise<void>;
}

// Fallback for SSR
const createNoopStorage = (): NoopStorage => ({
  getItem: async (_key) => null,
  setItem: async (_key, value) => {},
  removeItem: async (_key) => {},
});

// Use real storage only on client
const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

export default storage;
