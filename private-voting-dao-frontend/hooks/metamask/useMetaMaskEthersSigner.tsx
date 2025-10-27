"use client"

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { ethers } from "ethers";
import { useMetaMaskProvider } from "./useMetaMaskProvider";
import { useFhevm } from "@/fhevm/useFhevm";

type MetaMaskEthersSignerContextType = {
  signer: ethers.JsonRpcSigner | undefined;
  readonlyProvider: ethers.JsonRpcProvider | ethers.BrowserProvider | undefined;
  fhevmInstance: any;
  isFhevmLoading: boolean;
  fhevmError: string | undefined;
  chainId: number | undefined;
  account: string | undefined;
  sameChainRef: React.RefObject<(chainId: number | undefined) => boolean>;
  sameSignerRef: React.RefObject<
    (signer: ethers.JsonRpcSigner | undefined) => boolean
  >;
};

const MetaMaskEthersSignerContext = createContext<
  MetaMaskEthersSignerContextType | undefined
>(undefined);

export function MetaMaskEthersSignerProvider({
  children,
  initialMockChains,
}: {
  children: ReactNode;
  initialMockChains?: Record<number, string>;
}) {
  const { provider: eip1193Provider, selectedAccount, chainId } = useMetaMaskProvider();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>();
  const [readonlyProvider, setReadonlyProvider] = useState<
    ethers.JsonRpcProvider | ethers.BrowserProvider | undefined
  >();

  const signerRef = useRef<ethers.JsonRpcSigner | undefined>(signer);
  const chainIdRef = useRef<number | undefined>(chainId);

  useEffect(() => {
    signerRef.current = signer;
  }, [signer]);

  useEffect(() => {
    chainIdRef.current = chainId;
  }, [chainId]);

  const sameChainRef = useRef<(chainId: number | undefined) => boolean>(() => false);
  const sameSignerRef = useRef<
    (signer: ethers.JsonRpcSigner | undefined) => boolean
  >(() => false);

  sameChainRef.current = useCallback(
    (testChainId: number | undefined) => {
      return testChainId === chainIdRef.current;
    },
    []
  );

  sameSignerRef.current = useCallback(
    (testSigner: ethers.JsonRpcSigner | undefined) => {
      return testSigner === signerRef.current;
    },
    []
  );

  const {
    instance: fhevmInstance,
    isLoading: isFhevmLoading,
    error: fhevmError,
  } = useFhevm({
    provider: eip1193Provider,
    mockChains: initialMockChains,
  });

  useEffect(() => {
    if (!eip1193Provider || !selectedAccount) {
      setSigner(undefined);
      setReadonlyProvider(undefined);
      return;
    }

    const browserProvider = new ethers.BrowserProvider(eip1193Provider);
    browserProvider.getSigner(selectedAccount).then(setSigner);

    // Use the same BrowserProvider for readonly operations
    // This uses MetaMask's RPC endpoint, no need for separate Infura connection
    setReadonlyProvider(browserProvider);
  }, [eip1193Provider, selectedAccount, chainId]);

  const value = useMemo(
    () => ({
      signer,
      readonlyProvider,
      fhevmInstance,
      isFhevmLoading,
      fhevmError,
      chainId,
      account: selectedAccount,
      sameChainRef,
      sameSignerRef,
    }),
    [
      signer,
      readonlyProvider,
      fhevmInstance,
      isFhevmLoading,
      fhevmError,
      chainId,
      selectedAccount,
    ]
  );

  return (
    <MetaMaskEthersSignerContext.Provider value={value}>
      {children}
    </MetaMaskEthersSignerContext.Provider>
  );
}

export function useMetaMaskEthersSigner() {
  const context = useContext(MetaMaskEthersSignerContext);
  if (!context) {
    throw new Error(
      "useMetaMaskEthersSigner must be used within MetaMaskEthersSignerProvider"
    );
  }
  return context;
}

