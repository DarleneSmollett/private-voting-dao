import { ethers } from "ethers";
import { FhevmInstance } from "./fhevmTypes";
import { GenericStringStorage } from "./GenericStringStorage";

export type FhevmDecryptionSignature = {
  privateKey: string;
  publicKey: string;
  signature: string;
  contractAddresses: `0x${string}`[];
  userAddress: `0x${string}`;
  startTimestamp: number;
  durationDays: number;
};

const STORAGE_KEY_PREFIX = "fhevm_decryption_sig";

function _timestampNow(): number {
  return Math.floor(Date.now() / 1000);
}

export namespace FhevmDecryptionSignature {
  function buildStorageKey(
    userAddress: string,
    contractAddresses: string[]
  ): string {
    const sorted = [...contractAddresses].sort();
    return `${STORAGE_KEY_PREFIX}_${userAddress}_${sorted.join("_")}`;
  }

  export async function loadOrSign(
    instance: FhevmInstance,
    contractAddresses: string[],
    signer: ethers.JsonRpcSigner,
    storage: GenericStringStorage
  ): Promise<FhevmDecryptionSignature | null> {
    const userAddress = (await signer.getAddress()) as `0x${string}`;
    const storageKey = buildStorageKey(userAddress, contractAddresses);

    // Try to load from storage
    const stored = await storage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FhevmDecryptionSignature;
        // Check if signature is still valid
        const now = _timestampNow();
        const expiresAt = parsed.startTimestamp + parsed.durationDays * 24 * 60 * 60;
        if (now < expiresAt) {
          console.log("[FhevmDecryptionSignature] Using cached signature");
          return parsed;
        } else {
          console.log("[FhevmDecryptionSignature] Cached signature expired");
        }
      } catch (e) {
        console.log("[FhevmDecryptionSignature] Invalid cached signature:", e);
      }
    }

    // Generate new signature
    try {
      console.log("[FhevmDecryptionSignature] Creating new signature...");
      
      // Generate FHEVM key pair using instance.generateKeypair()
      const { publicKey, privateKey } = instance.generateKeypair();
      console.log("[FhevmDecryptionSignature] Generated FHEVM keypair");

      const startTimestamp = _timestampNow();
      const durationDays = 365; // 1 year validity

      // Sort contract addresses
      const sortedContractAddresses = [...contractAddresses].sort() as `0x${string}`[];

      // Create EIP-712 structure using FHEVM instance's method
      const eip712 = instance.createEIP712(
        publicKey,
        sortedContractAddresses,
        startTimestamp,
        durationDays
      );

      console.log("[FhevmDecryptionSignature] EIP-712 structure created");

      // Sign using the correct EIP-712 structure
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      console.log("[FhevmDecryptionSignature] ✅ Signature created successfully");

      const result: FhevmDecryptionSignature = {
        privateKey,
        publicKey,
        signature,
        contractAddresses: sortedContractAddresses,
        userAddress,
        startTimestamp,
        durationDays,
      };

      // Store for future use
      await storage.setItem(storageKey, JSON.stringify(result));
      console.log("[FhevmDecryptionSignature] Signature cached");

      return result;
    } catch (e) {
      console.error("[FhevmDecryptionSignature] ❌ Failed to create signature:", e);
      return null;
    }
  }
}
