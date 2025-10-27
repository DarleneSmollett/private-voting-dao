import { isAddress, Eip1193Provider, JsonRpcProvider } from "ethers";
import type {
  FhevmInitSDKOptions,
  FhevmInitSDKType,
  FhevmLoadSDKType,
  FhevmWindowType,
} from "./fhevmTypes";
import { isFhevmWindowType, RelayerSDKLoader } from "./RelayerSDKLoader";
import { publicKeyStorageGet, publicKeyStorageSet } from "./PublicKeyStorage";
import { FhevmInstance, FhevmInstanceConfig } from "../fhevmTypes";

export class FhevmReactError extends Error {
  code: string;
  constructor(code: string, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "FhevmReactError";
  }
}

function throwFhevmError(
  code: string,
  message?: string,
  cause?: unknown
): never {
  throw new FhevmReactError(code, message, cause ? { cause } : undefined);
}

const isFhevmInitialized = (): boolean => {
  if (!isFhevmWindowType(window, console.log)) {
    return false;
  }
  return window.relayerSDK.__initialized__ === true;
};

const fhevmLoadSDK: FhevmLoadSDKType = () => {
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
};

const fhevmInitSDK: FhevmInitSDKType = async (
  options?: FhevmInitSDKOptions
) => {
  if (!isFhevmWindowType(window, console.log)) {
    throw new Error("window.relayerSDK is not available");
  }
  const result = await window.relayerSDK.initSDK(options);
  window.relayerSDK.__initialized__ = result;
  if (!result) {
    throw new Error("window.relayerSDK.initSDK failed.");
  }
  return true;
};

function checkIsAddress(a: unknown): a is `0x${string}` {
  if (typeof a !== "string") {
    return false;
  }
  if (!isAddress(a)) {
    return false;
  }
  return true;
}

export class FhevmAbortError extends Error {
  constructor(message = "FHEVM operation was cancelled") {
    super(message);
    this.name = "FhevmAbortError";
  }
}

type FhevmRelayerStatusType =
  | "sdk-loading"
  | "sdk-loaded"
  | "sdk-initializing"
  | "sdk-initialized"
  | "creating";

async function getChainId(
  providerOrUrl: Eip1193Provider | string
): Promise<number> {
  if (typeof providerOrUrl === "string") {
    const provider = new JsonRpcProvider(providerOrUrl);
    return Number((await provider.getNetwork()).chainId);
  }
  const chainId = await providerOrUrl.request({ method: "eth_chainId" });
  return Number.parseInt(chainId as string, 16);
}

async function getWeb3Client(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("web3_clientVersion", []);
    return version;
  } catch (e) {
    throwFhevmError(
      "WEB3_CLIENTVERSION_ERROR",
      `The URL ${rpcUrl} is not a Web3 node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string): Promise<
  | {
      ACLAddress: `0x${string}`;
      InputVerifierAddress: `0x${string}`;
      KMSVerifierAddress: `0x${string}`;
    }
  | undefined
> {
  const version = await getWeb3Client(rpcUrl);
  if (
    typeof version !== "string" ||
    !version.toLowerCase().includes("hardhat")
  ) {
    // Not a Hardhat Node
    return undefined;
  }
  try {
    const metadata = await getFHEVMRelayerMetadata(rpcUrl);
    if (!metadata || typeof metadata !== "object") {
      return undefined;
    }
    if (
      !(
        "ACLAddress" in metadata &&
        typeof metadata.ACLAddress === "string" &&
        metadata.ACLAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    if (
      !(
        "InputVerifierAddress" in metadata &&
        typeof metadata.InputVerifierAddress === "string" &&
        metadata.InputVerifierAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    if (
      !(
        "KMSVerifierAddress" in metadata &&
        typeof metadata.KMSVerifierAddress === "string" &&
        metadata.KMSVerifierAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    return metadata;
  } catch {
    // Not a FHEVM Hardhat Node
    return undefined;
  }
}

async function getFHEVMRelayerMetadata(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("fhevm_relayer_metadata", []);
    return version;
  } catch (e) {
    throwFhevmError(
      "FHEVM_RELAYER_METADATA_ERROR",
      `The URL ${rpcUrl} is not a FHEVM Hardhat node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

type MockResolveResult = { isMock: true; chainId: number; rpcUrl: string };
type GenericResolveResult = { isMock: false; chainId: number; rpcUrl?: string };
type ResolveResult = MockResolveResult | GenericResolveResult;

async function resolve(
  providerOrUrl: Eip1193Provider | string,
  mockChains?: Record<number, string>
): Promise<ResolveResult> {
  // Resolve chainId
  const chainId = await getChainId(providerOrUrl);

  // Resolve rpc url
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;

  const _mockChains: Record<number, string> = {
    31337: "http://localhost:8545",
    ...(mockChains ?? {}),
  };

  // Help Typescript solver here:
  if (Object.hasOwn(_mockChains, chainId)) {
    if (!rpcUrl) {
      rpcUrl = _mockChains[chainId];
    }

    return { isMock: true, chainId, rpcUrl };
  }

  return { isMock: false, chainId, rpcUrl };
}

export const createFhevmInstance = async (parameters: {
  provider: Eip1193Provider | string;
  mockChains?: Record<number, string>;
  signal: AbortSignal;
  onStatusChange?: (status: FhevmRelayerStatusType) => void;
}): Promise<FhevmInstance> => {
  const throwIfAborted = () => {
    if (signal.aborted) throw new FhevmAbortError();
  };

  const notify = (status: FhevmRelayerStatusType) => {
    if (onStatusChange) onStatusChange(status);
  };

  const {
    signal,
    onStatusChange,
    provider: providerOrUrl,
    mockChains,
  } = parameters;

  console.log("[createFhevmInstance] Starting with provider:", providerOrUrl);

  // Resolve chainId
  const { isMock, rpcUrl, chainId } = await resolve(providerOrUrl, mockChains);
  console.log("[createFhevmInstance] Resolved:", { isMock, rpcUrl, chainId });

  if (isMock) {
    console.log("[createFhevmInstance] Detected mock mode, checking FHEVM metadata...");
    // Throws an error if cannot connect or url does not refer to a Web3 client
    const fhevmRelayerMetadata =
      await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);
    
    console.log("[createFhevmInstance] FHEVM metadata:", fhevmRelayerMetadata);

    if (fhevmRelayerMetadata) {
      // fhevmRelayerMetadata is defined, which means rpcUrl refers to a FHEVM Hardhat Node
      notify("creating");

      console.log("[createFhevmInstance] Creating mock instance with metadata:", fhevmRelayerMetadata);

      //////////////////////////////////////////////////////////////////////////
      // 
      // WARNING!!
      // ALWAYS USE DYNAMIC IMPORT TO AVOID INCLUDING THE ENTIRE FHEVM MOCK LIB 
      // IN THE FINAL PRODUCTION BUNDLE!!
      // 
      //////////////////////////////////////////////////////////////////////////
      const fhevmMock = await import("./mock/fhevmMock");
      
      try {
        const mockInstance = await fhevmMock.fhevmMockCreateInstance({
          rpcUrl,
          chainId,
          metadata: fhevmRelayerMetadata,
        });

        console.log("[createFhevmInstance] Mock instance created successfully!");
        throwIfAborted();

        return mockInstance;
      } catch (error) {
        console.error("[createFhevmInstance] Failed to create mock instance:", error);
        throw error;
      }
    } else {
      console.warn("[createFhevmInstance] No FHEVM metadata found, falling back to relayer SDK");
    }
  }

  throwIfAborted();

  console.log("[createFhevmInstance] Checking if FHEVM SDK is loaded...");
  if (!isFhevmWindowType(window, console.log)) {
    console.log("[createFhevmInstance] SDK not loaded, loading from CDN...");
    notify("sdk-loading");

    try {
      // throws an error if failed
      await fhevmLoadSDK();
      console.log("[createFhevmInstance] SDK loaded successfully!");
      throwIfAborted();

      notify("sdk-loaded");
    } catch (error) {
      console.error("[createFhevmInstance] Failed to load SDK:", error);
      throw error;
    }
  } else {
    console.log("[createFhevmInstance] SDK already loaded");
  }

  // notify that state === "sdk-loaded"

  console.log("[createFhevmInstance] Checking if FHEVM is initialized...");
  if (!isFhevmInitialized()) {
    console.log("[createFhevmInstance] Initializing FHEVM...");
    notify("sdk-initializing");

    try {
      // throws an error if failed
      await fhevmInitSDK();
      console.log("[createFhevmInstance] FHEVM initialized successfully!");
      throwIfAborted();

      notify("sdk-initialized");
    } catch (error) {
      console.error("[createFhevmInstance] Failed to initialize FHEVM:", error);
      throw error;
    }
  } else {
    console.log("[createFhevmInstance] FHEVM already initialized");
  }

  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;
  console.log("[createFhevmInstance] RelayerSDK retrieved:", relayerSDK);

  const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress;
  console.log("[createFhevmInstance] ACL Address:", aclAddress);
  if (!checkIsAddress(aclAddress)) {
    throw new Error(`Invalid address: ${aclAddress}`);
  }

  console.log("[createFhevmInstance] Getting public key from storage...");
  let pub = await publicKeyStorageGet(aclAddress);
  
  throwIfAborted();

  // Check if we have valid cached keys (Uint8Array means successfully decoded)
  const hasCachedKey = pub.publicKey instanceof Uint8Array && pub.publicKey.length > 0;
  const hasCachedParams = pub.publicParams instanceof Uint8Array && pub.publicParams.length > 0;
  
  console.log("[createFhevmInstance] Cache status:", {
    hasKey: hasCachedKey,
    hasParams: hasCachedParams,
    keyType: hasCachedKey ? 'Uint8Array' : typeof pub.publicKey,
    keyLength: hasCachedKey ? pub.publicKey.length : 0,
  });

  // Prepare config - only include publicKey and publicParams if they are valid Uint8Arrays
  const config: FhevmInstanceConfig = {
    ...relayerSDK.SepoliaConfig,
    network: providerOrUrl,
    ...(hasCachedKey ? { publicKey: pub.publicKey as Uint8Array } : {}),
    ...(hasCachedParams ? { publicParams: pub.publicParams as Uint8Array } : {}),
  };
  
  if (!hasCachedKey || !hasCachedParams) {
    console.log("[createFhevmInstance] Public key not in cache, SDK will fetch from network");
  } else {
    console.log("[createFhevmInstance] ✅ Using cached public key (Uint8Array)");
  }

  // notify that state === "creating"
  notify("creating");
  console.log("[createFhevmInstance] Creating FHEVM instance...");

  try {
    const instance = await relayerSDK.createInstance(config);
    console.log("[createFhevmInstance] Instance created successfully!");

    // Always update cache with fresh keys from the instance
    // Keys are stored as Base64 strings in IndexedDB
    try {
      const actualPublicKey = instance.getPublicKey();
      const actualPublicParams = instance.getPublicParams(2048);
      
      console.log("[createFhevmInstance] Saving public key to cache (Uint8Array → Base64)...");
      
      await publicKeyStorageSet(
        aclAddress,
        actualPublicKey,
        actualPublicParams
      );
      console.log("[createFhevmInstance] ✅ Public key cached successfully");
    } catch (saveError) {
      console.error("[createFhevmInstance] ⚠️ Failed to cache public key (non-fatal):", saveError);
      // Don't fail the instance creation if we can't save the key
    }

    throwIfAborted();

    return instance;
  } catch (error: any) {
    console.error("[createFhevmInstance] ❌ Failed to create instance:", error);
    console.error("[createFhevmInstance] Error details:", {
      message: error?.message || String(error),
      hadCachedKey: hasCachedKey,
      hadCachedParams: hasCachedParams,
    });
    
    // Clear potentially corrupted cache
    try {
      console.log("[createFhevmInstance] Clearing cache to force fresh fetch on next attempt...");
      await publicKeyStorageSet(aclAddress, "", "");
      console.log("[createFhevmInstance] Cache cleared");
    } catch (clearError) {
      console.error("[createFhevmInstance] Failed to clear cache:", clearError);
    }
    
    throw error;
  }
};

