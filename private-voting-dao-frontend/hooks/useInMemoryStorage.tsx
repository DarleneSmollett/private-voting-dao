"use client";

import { createContext, ReactNode, useContext, useRef } from "react";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

class InMemoryStorage implements GenericStringStorage {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const InMemoryStorageContext = createContext<GenericStringStorage | undefined>(
  undefined
);

export function InMemoryStorageProvider({ children }: { children: ReactNode }) {
  const storageRef = useRef<GenericStringStorage>(new InMemoryStorage());

  return (
    <InMemoryStorageContext.Provider value={storageRef.current}>
      {children}
    </InMemoryStorageContext.Provider>
  );
}

export function useInMemoryStorage(): GenericStringStorage {
  const storage = useContext(InMemoryStorageContext);
  if (!storage) {
    throw new Error(
      "useInMemoryStorage must be used within InMemoryStorageProvider"
    );
  }
  return storage;
}

