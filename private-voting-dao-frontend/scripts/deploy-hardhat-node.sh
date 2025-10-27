#!/bin/bash

# This script deploys contracts to the local Hardhat node

cd ../fhevm-hardhat-template

echo "Deploying contracts to localhost..."
npx hardhat deploy --network localhost

echo "✅ Deployment complete"

