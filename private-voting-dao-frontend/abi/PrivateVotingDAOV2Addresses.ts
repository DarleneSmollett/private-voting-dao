export function PRIVATE_VOTING_DAO_V2_ADDRESS(): `0x${string}` | undefined {
  const chainId = typeof window !== "undefined" 
    ? (window as any).ethereum?.chainId 
    : undefined;

  const addresses: Record<string, `0x${string}`> = {
    "0x7a69": "0x673B3b40fc67b78ef9CB5d95b902Ea6c4531212A", // localhost (31337)
    "0xaa36a7": "0x39365615dBF518746Ae9e0e470707AF9CD813beF", // sepolia (11155111)
  };

  if (!chainId) return undefined;
  return addresses[chainId.toLowerCase()];
}
