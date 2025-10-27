import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "fhevm-public-keys";
const STORE_NAME = "keys";
const DB_VERSION = 2; // Increment version to trigger upgrade

type PublicKeyRecord = {
  aclAddress: string;
  publicKey: string;  // Base64 encoded
  publicParams: string;  // Base64 encoded
};

let dbPromise: Promise<IDBPDatabase> | undefined;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "aclAddress" });
          }
        }
        if (oldVersion < 2) {
          // Clear old data when upgrading to v2 (new encoding format)
          if (db.objectStoreNames.contains(STORE_NAME)) {
            const store = transaction.objectStore(STORE_NAME);
            store.clear();
            console.log("[PublicKeyStorage] Cleared old cache during DB upgrade");
          }
        }
      },
    });
  }
  return dbPromise;
}

// Helper: Convert Uint8Array to Base64
function uint8ArrayToBase64(arr: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arr).toString('base64');
  }
  // Browser fallback
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  // Browser fallback
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function publicKeyStorageGet(
  aclAddress: string
): Promise<{ publicKey: Uint8Array | string; publicParams: Uint8Array | string }> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, aclAddress);
  
  if (record && record.publicKey && record.publicParams) {
    // Validate that cached data is in correct format (Base64 strings)
    if (typeof record.publicKey !== 'string' || typeof record.publicParams !== 'string') {
      console.warn("[PublicKeyStorage] Cached data is in old format (not Base64 strings), clearing cache...");
      // Clear old format cache
      await publicKeyStorageSet(aclAddress, "", "");
      return {
        publicKey: "",
        publicParams: "",
      };
    }
    
    try {
      // Decode Base64 back to Uint8Array
      return {
        publicKey: base64ToUint8Array(record.publicKey),
        publicParams: base64ToUint8Array(record.publicParams),
      };
    } catch (error) {
      console.error("[PublicKeyStorage] Failed to decode Base64 keys, clearing cache:", error);
      // Clear corrupted cache
      await publicKeyStorageSet(aclAddress, "", "");
      return {
        publicKey: "",
        publicParams: "",
      };
    }
  }

  // Return empty strings if not found
  return {
    publicKey: "",
    publicParams: "",
  };
}

export async function publicKeyStorageSet(
  aclAddress: string,
  publicKey: Uint8Array | string,
  publicParams: Uint8Array | string
): Promise<void> {
  const db = await getDB();
  
  // Convert Uint8Array to Base64 for storage
  const publicKeyBase64 = publicKey instanceof Uint8Array 
    ? uint8ArrayToBase64(publicKey) 
    : publicKey;
  const publicParamsBase64 = publicParams instanceof Uint8Array 
    ? uint8ArrayToBase64(publicParams) 
    : publicParams;
  
  await db.put(STORE_NAME, {
    aclAddress,
    publicKey: publicKeyBase64,
    publicParams: publicParamsBase64,
  } as PublicKeyRecord);
}

