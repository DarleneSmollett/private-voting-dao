"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Eip1193Provider } from "ethers";
import { useEip6963 } from "./useEip6963";

type MetaMaskContextType = {
  provider: Eip1193Provider | undefined;
  selectedAccount: string | undefined;
  chainId: number | undefined;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
};

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(
  undefined
);

export function MetaMaskProvider({ children }: { children: ReactNode }) {
  const providers = useEip6963();
  const [provider, setProvider] = useState<Eip1193Provider | undefined>();
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();

  // Auto-select MetaMask provider
  useEffect(() => {
    const metamask = providers.find((p) =>
      p.info.name.toLowerCase().includes("metamask")
    );
    if (metamask && !provider) {
      setProvider(metamask.provider);
    }
  }, [providers, provider]);

  // Listen to account and chain changes
  useEffect(() => {
    if (!provider) return;

    const handleAccountsChanged = (accounts: unknown) => {
      if (Array.isArray(accounts) && accounts.length > 0) {
        setSelectedAccount(accounts[0] as string);
      } else {
        setSelectedAccount(undefined);
      }
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      if (typeof chainIdHex === "string") {
        setChainId(parseInt(chainIdHex, 16));
      }
    };

    (provider as any).on?.("accountsChanged", handleAccountsChanged);
    (provider as any).on?.("chainChanged", handleChainChanged);

    // Get initial values
    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          setSelectedAccount(accounts[0] as string);
        }
      })
      .catch(console.error);

    provider
      .request({ method: "eth_chainId" })
      .then((chainIdHex) => {
        if (typeof chainIdHex === "string") {
          setChainId(parseInt(chainIdHex, 16));
        }
      })
      .catch(console.error);

    return () => {
      (provider as any).removeListener?.("accountsChanged", handleAccountsChanged);
      (provider as any).removeListener?.("chainChanged", handleChainChanged);
    };
  }, [provider]);

  const connect = useCallback(async () => {
    if (!provider) {
      throw new Error("No provider available");
    }

    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      if (Array.isArray(accounts) && accounts.length > 0) {
        setSelectedAccount(accounts[0] as string);
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      throw error;
    }
  }, [provider]);

  const disconnect = useCallback(() => {
    setSelectedAccount(undefined);
  }, []);

  const switchChain = useCallback(
    async (targetChainId: number) => {
      if (!provider) {
        throw new Error("No provider available");
      }

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      } catch (error: any) {
        // Chain not added, try to add it
        if (error.code === 4902) {
          // For local chains
          if (targetChainId === 31337) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x7a69",
                  chainName: "Localhost 8545",
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["http://localhost:8545"],
                },
              ],
            });
          }
        } else {
          throw error;
        }
      }
    },
    [provider]
  );

  return (
    <MetaMaskContext.Provider
      value={{
        provider,
        selectedAccount,
        chainId,
        connect,
        disconnect,
        switchChain,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
}

export function useMetaMaskProvider() {
  const context = useContext(MetaMaskContext);
  if (!context) {
    throw new Error(
      "useMetaMaskProvider must be used within MetaMaskProvider"
    );
  }
  return context;
}

