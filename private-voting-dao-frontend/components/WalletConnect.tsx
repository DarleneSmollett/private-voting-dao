"use client";

import { useMetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { formatAddress } from "@/lib/utils";

export function WalletConnect() {
  const { selectedAccount, chainId, connect, disconnect, switchChain } =
    useMetaMaskProvider();

  const getChainName = (chainId: number | undefined) => {
    if (chainId === 31337) return "Localhost";
    if (chainId === 11155111) return "Sepolia";
    return chainId ? `Chain ${chainId}` : "Unknown";
  };

  return (
    <div className="flex items-center gap-4">
      {selectedAccount ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {getChainName(chainId)}
            </span>
            <span className="px-3 py-1 bg-blue-600 rounded-lg text-sm">
              {formatAddress(selectedAccount)}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
          >
            断开连接
          </button>
        </>
      ) : (
        <button
          onClick={connect}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
        >
          连接钱包
        </button>
      )}
    </div>
  );
}

