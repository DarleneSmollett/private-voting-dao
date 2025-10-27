export type FhevmInitSDKOptions = {
  rpcUrl?: string;
};

export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;
export type FhevmLoadSDKType = () => Promise<void>;

export type FhevmRelayerSDKType = {
  initSDK: FhevmInitSDKType;
  createInstance: (config: any) => Promise<any>;
  SepoliaConfig: any;
  __initialized__?: boolean;
};

export type FhevmWindowType = Window & {
  relayerSDK: FhevmRelayerSDKType;
};

