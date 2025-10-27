# Private Voting DAO

A decentralized voting platform built on **FHEVM (Fully Homomorphic Encryption Virtual Machine)** by Zama, enabling end-to-end encrypted voting with on-chain homomorphic tallying and verifiable results.

## Features

- 🔐 **Encrypted Voting**: All votes are encrypted using FHEVM before submission
- 📊 **Homomorphic Tallying**: Votes are tallied on-chain over ciphertexts
- 🔓 **Decryptable Results**: Results are revealed only after the voting period ends
- 🌐 **Sepolia Deployment**: Live on Sepolia testnet at `0x39365615dBF518746Ae9e0e470707AF9CD813beF`
- 🎨 **Modern UI**: Clean interface with dark mode support
- 🌏 **Bilingual**: Supports both Chinese and English

## Tech Stack

- **Smart Contracts**: Solidity + FHEVM (FHE operations, `euint8`, `euint32`, `ebool`)
- **Frontend**: Next.js + React + TypeScript + Tailwind CSS
- **Wallet**: MetaMask (EIP-6963 support)
- **FHEVM SDK**: `@zama-fhe/relayer-sdk` + `@fhevm/mock-utils`

## Project Structure

```
├── fhevm-hardhat-template/     # Smart contracts and deployment
│   ├── contracts/              # Solidity contracts (PrivateVotingDAO, PrivateVotingDAOV2)
│   ├── deploy/                 # Deployment scripts
│   ├── test/                   # Contract tests
│   └── tasks/                  # Hardhat tasks
└── private-voting-dao-frontend/ # Frontend application
    ├── app/                    # Next.js pages
    ├── components/             # React components
    ├── hooks/                  # Custom hooks (FHEVM, MetaMask)
    └── fhevm/                  # FHEVM integration
```

## Quick Start

### Smart Contracts

```bash
cd fhevm-hardhat-template

# Install dependencies
npm install

# Run local Hardhat node
npm run node

# Deploy contract (in another terminal)
npm run deploy:localhost

# Run tests
npm test
```

### Frontend

```bash
cd private-voting-dao-frontend

# Install dependencies
npm install

# Mock mode (with local Hardhat node)
npm run dev:mock

# Real network mode (Sepolia)
npm run dev
```

## Key FHEVM Features

1. **Encrypted Types**: `euint8`, `euint32`, `ebool` for encrypted data
2. **Homomorphic Operations**: `FHE.add`, `FHE.sub`, `FHE.select` for computations on ciphertexts
3. **External Inputs**: `FHE.fromExternal` + `inputProof` for encrypted parameters
4. **Client-side Decryption**: EIP-712 signatures for authorized decryption
5. **Cached Public Keys**: IndexedDB storage for performance

## License

MIT
