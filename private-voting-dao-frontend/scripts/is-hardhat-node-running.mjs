import { JsonRpcProvider } from "ethers";

const RPC_URL = "http://localhost:8545";

async function isHardhatNodeRunning() {
  try {
    const provider = new JsonRpcProvider(RPC_URL);
    const version = await provider.send("web3_clientVersion", []);
    provider.destroy();
    
    if (typeof version === "string" && version.toLowerCase().includes("hardhat")) {
      console.log("✅ Hardhat node is running");
      return true;
    }
    
    console.error("❌ The node at", RPC_URL, "is not a Hardhat node");
    process.exit(1);
  } catch (e) {
    console.error("❌ Hardhat node is not running at", RPC_URL);
    console.error("Please start it with: cd fhevm-hardhat-template && npx hardhat node");
    process.exit(1);
  }
}

isHardhatNodeRunning();

