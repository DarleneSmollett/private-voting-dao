export type EIP712Type = {
  domain: {
    chainId: number;
    name: string;
    version: string;
    verifyingContract: string;
  };
  types: {
    UserDecryptRequestVerification: Array<{ name: string; type: string }>;
  };
  message: {
    publicKey: string;
    contractAddresses: string[];
    startTimestamp: number;
    durationDays: number;
  };
};

export type FhevmInstance = {
  createEncryptedInput: (
    contractAddress: string,
    userAddress: string
  ) => EncryptedInput;
  userDecrypt: (
    handles: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number
  ) => Promise<Record<string, bigint | boolean>>;
  createEIP712: (
    publicKey: string,
    contractAddresses: string[],
    startTimestamp: number,
    durationDays: number
  ) => EIP712Type;
  generateKeypair: () => { publicKey: string; privateKey: string };
  getPublicKey: () => string;
  getPublicParams: (bits: number) => string;
};

export type EncryptedInput = {
  add8(value: number): EncryptedInput;
  add16(value: number): EncryptedInput;
  add32(value: number): EncryptedInput;
  add64(value: bigint): EncryptedInput;
  addBool(value: boolean): EncryptedInput;
  addAddress(value: string): EncryptedInput;
  encrypt(): Promise<{ handles: string[]; inputProof: string }>;
};

export type FhevmInstanceConfig = {
  network: any;
  publicKey: string;
  publicParams: string;
  aclContractAddress: string;
  kmsVerifierContractAddress: string;
  executorContractAddress: string;
  decryptionOracleContractAddress: string;
  inputVerifierContractAddress: string;
};

