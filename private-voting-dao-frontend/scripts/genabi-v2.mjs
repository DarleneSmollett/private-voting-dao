#!/usr/bin/env node
import fs from "fs";
import path from "path";

const CONTRACT_NAME = "PrivateVotingDAOV2";
const HARDHAT_DIR = path.resolve("../fhevm-hardhat-template");
const ABI_OUTPUT_DIR = path.resolve("abi");

// Read deployment info
function getDeploymentInfo(network) {
  const deploymentPath = path.join(
    HARDHAT_DIR,
    "deployments",
    network,
    `${CONTRACT_NAME}.json`
  );
  
  if (!fs.existsSync(deploymentPath)) {
    console.warn(`⚠️  No deployment found for ${network}`);
    return null;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  return {
    address: deployment.address,
    abi: deployment.abi,
  };
}

// Generate ABI file
function generateABI(abi) {
  const content = `export const PRIVATE_VOTING_DAO_V2_ABI = ${JSON.stringify(abi, null, 2)} as const;\n`;
  const outputPath = path.join(ABI_OUTPUT_DIR, `${CONTRACT_NAME}ABI.ts`);
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Generated ${outputPath}`);
}

// Generate Addresses file
function generateAddresses(localhostAddress, sepoliaAddress) {
  const content = `export function PRIVATE_VOTING_DAO_V2_ADDRESS(): \`0x\${string}\` | undefined {
  const chainId = typeof window !== "undefined" 
    ? (window as any).ethereum?.chainId 
    : undefined;

  const addresses: Record<string, \`0x\${string}\`> = {
    "0x7a69": "${localhostAddress || "0x0000000000000000000000000000000000000000"}", // localhost (31337)
    "0xaa36a7": "${sepoliaAddress || "0x0000000000000000000000000000000000000000"}", // sepolia (11155111)
  };

  if (!chainId) return undefined;
  return addresses[chainId.toLowerCase()];
}
`;
  const outputPath = path.join(ABI_OUTPUT_DIR, `${CONTRACT_NAME}Addresses.ts`);
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Generated ${outputPath}`);
}

// Main
function main() {
  console.log(`🔄 Generating ABI and addresses for ${CONTRACT_NAME}...`);

  const localhost = getDeploymentInfo("localhost");
  const sepolia = getDeploymentInfo("sepolia");

  // Use ABI from any available deployment, or use default addresses
  if (localhost || sepolia) {
    const abi = (localhost || sepolia).abi;
    generateABI(abi);
    generateAddresses(
      localhost?.address,
      sepolia?.address
    );
    console.log("✅ ABI generation complete!");
  } else {
    // No deployments found, use default addresses (already in the file)
    console.log("⚠️  No deployments found, keeping existing addresses file.");
    console.log("✅ ABI generation complete!");
  }
}

main();

