"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Eip1193Provider } from "ethers";
import { FhevmInstance } from "./fhevmTypes";
import { createFhevmInstance } from "./internal/fhevm";

export function useFhevm(parameters: {
  provider: Eip1193Provider | undefined;
  mockChains?: Record<number, string>;
}) {
  const { provider, mockChains } = parameters;
  const [instance, setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const createInstance = useCallback(async () => {
    if (!provider) {
      setInstance(undefined);
      return;
    }

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(undefined);

    try {
      const newInstance = await createFhevmInstance({
        provider,
        mockChains,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setInstance(newInstance);
        setIsLoading(false);
      }
    } catch (e: any) {
      if (!controller.signal.aborted) {
        setError(e?.message || "Failed to create FHEVM instance");
        setIsLoading(false);
      }
    }
  }, [provider, mockChains]);

  useEffect(() => {
    createInstance();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [createInstance]);

  return {
    instance,
    isLoading,
    error,
    recreate: createInstance,
  };
}

