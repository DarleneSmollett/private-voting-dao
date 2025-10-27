import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";

task("voting:create-proposal", "Create a new proposal")
  .addParam("title", "The proposal title")
  .addParam("description", "The proposal description")
  .addParam("options", "Number of options (2-10)")
  .addParam("duration", "Voting duration in seconds")
  .addOptionalParam("strategy", "Result strategy (0=PublicOnEnd, 1=PrivateToOwner, 2=PrivateToDAO)", "0")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const PrivateVotingDAO = await deployments.get("PrivateVotingDAO");
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateVotingDAO", PrivateVotingDAO.address);

    console.log("Creating proposal...");
    const tx = await contract.connect(signers[0]).createProposal(
      taskArgs.title,
      taskArgs.description,
      parseInt(taskArgs.options),
      parseInt(taskArgs.duration),
      parseInt(taskArgs.strategy)
    );

    const receipt = await tx.wait();
    console.log(`✅ Proposal created! Transaction: ${receipt?.hash}`);

    const proposalCount = await contract.proposalCount();
    console.log(`📝 Proposal ID: ${proposalCount}`);
  });

task("voting:cast-vote", "Cast an encrypted vote")
  .addParam("proposal", "The proposal ID")
  .addParam("option", "The option index to vote for")
  .addParam("weight", "The vote weight")
  .addOptionalParam("account", "The account index (default: 1)", "1")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const PrivateVotingDAO = await deployments.get("PrivateVotingDAO");
    const signers = await ethers.getSigners();
    const accountIndex = parseInt(taskArgs.account);
    const signer = signers[accountIndex];
    const contract = await ethers.getContractAt("PrivateVotingDAO", PrivateVotingDAO.address);

    console.log(`Casting vote from account ${accountIndex} (${signer.address})...`);

    // Get FHEVM instance
    const instance = await ethers.fhevm.createInstance();

    // Encrypt option
    const inputOption = instance.createEncryptedInput(PrivateVotingDAO.address, signer.address);
    inputOption.add8(parseInt(taskArgs.option));
    const encryptedOption = await inputOption.encrypt();

    // Encrypt weight
    const inputWeight = instance.createEncryptedInput(PrivateVotingDAO.address, signer.address);
    inputWeight.add8(parseInt(taskArgs.weight));
    const encryptedWeight = await inputWeight.encrypt();

    console.log("Submitting encrypted vote...");
    const tx = await contract.connect(signer).castVote(
      parseInt(taskArgs.proposal),
      encryptedOption.handles[0],
      encryptedWeight.handles[0],
      encryptedOption.inputProof,
      encryptedWeight.inputProof
    );

    const receipt = await tx.wait();
    console.log(`✅ Vote cast! Transaction: ${receipt?.hash}`);
  });

task("voting:end-proposal", "End a proposal")
  .addParam("proposal", "The proposal ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const PrivateVotingDAO = await deployments.get("PrivateVotingDAO");
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateVotingDAO", PrivateVotingDAO.address);

    console.log(`Ending proposal ${taskArgs.proposal}...`);
    const tx = await contract.connect(signers[0]).endProposal(parseInt(taskArgs.proposal));
    const receipt = await tx.wait();
    console.log(`✅ Proposal ended! Transaction: ${receipt?.hash}`);
  });

task("voting:get-proposal", "Get proposal details")
  .addParam("proposal", "The proposal ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const PrivateVotingDAO = await deployments.get("PrivateVotingDAO");
    const contract = await ethers.getContractAt("PrivateVotingDAO", PrivateVotingDAO.address);

    const proposal = await contract.getProposal(parseInt(taskArgs.proposal));
    
    console.log("\n📋 Proposal Details:");
    console.log(`  ID: ${proposal.id}`);
    console.log(`  Title: ${proposal.title}`);
    console.log(`  Description: ${proposal.description}`);
    console.log(`  Proposer: ${proposal.proposer}`);
    console.log(`  Option Count: ${proposal.optionCount}`);
    console.log(`  Start Time: ${new Date(Number(proposal.startTime) * 1000).toISOString()}`);
    console.log(`  End Time: ${new Date(Number(proposal.endTime) * 1000).toISOString()}`);
    console.log(`  Status: ${["Active", "Ended", "Cancelled"][proposal.status]}`);
    console.log(`  Result Strategy: ${["PublicOnEnd", "PrivateToOwner", "PrivateToDAO"][proposal.resultStrategy]}`);
    console.log(`  Results Revealed: ${proposal.resultsRevealed}`);
  });

task("voting:allow-results", "Allow access to proposal results")
  .addParam("proposal", "The proposal ID")
  .addOptionalParam("account", "The account index (default: 0)", "0")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const PrivateVotingDAO = await deployments.get("PrivateVotingDAO");
    const signers = await ethers.getSigners();
    const accountIndex = parseInt(taskArgs.account);
    const signer = signers[accountIndex];
    const contract = await ethers.getContractAt("PrivateVotingDAO", PrivateVotingDAO.address);

    console.log(`Requesting results access from account ${accountIndex}...`);
    const tx = await contract.connect(signer).allowResultsAccess(parseInt(taskArgs.proposal));
    const receipt = await tx.wait();
    console.log(`✅ Results access granted! Transaction: ${receipt?.hash}`);
  });

task("voting:decrypt-results", "Decrypt proposal results")
  .addParam("proposal", "The proposal ID")
  .addOptionalParam("account", "The account index (default: 0)", "0")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const PrivateVotingDAO = await deployments.get("PrivateVotingDAO");
    const signers = await ethers.getSigners();
    const accountIndex = parseInt(taskArgs.account);
    const signer = signers[accountIndex];
    const contract = await ethers.getContractAt("PrivateVotingDAO", PrivateVotingDAO.address);

    const proposal = await contract.getProposal(parseInt(taskArgs.proposal));
    const instance = await ethers.fhevm.createInstance();

    console.log(`\n🔐 Decrypting results for proposal ${taskArgs.proposal}...`);

    // Get total voters handle
    const totalVotersHandle = await contract.getTotalVoters(parseInt(taskArgs.proposal));

    // Decrypt total voters
    const totalVoters = await instance.userDecryptEuint32(totalVotersHandle, signer.address);
    console.log(`\n👥 Total Voters (by weight): ${totalVoters}`);

    console.log(`\n📊 Option Results:`);
    for (let i = 0; i < proposal.optionCount; i++) {
      const optionHandle = await contract.getOptionVotes(parseInt(taskArgs.proposal), i);
      const votes = await instance.userDecryptEuint32(optionHandle, signer.address);
      console.log(`  Option ${i}: ${votes} votes`);
    }
  });

task("voting:get-my-vote", "Get and decrypt your own vote")
  .addParam("proposal", "The proposal ID")
  .addOptionalParam("account", "The account index (default: 1)", "1")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const PrivateVotingDAO = await deployments.get("PrivateVotingDAO");
    const signers = await ethers.getSigners();
    const accountIndex = parseInt(taskArgs.account);
    const signer = signers[accountIndex];
    const contract = await ethers.getContractAt("PrivateVotingDAO", PrivateVotingDAO.address);

    console.log(`Getting vote for account ${accountIndex} (${signer.address})...`);

    const vote = await contract.connect(signer).getMyVote(parseInt(taskArgs.proposal));
    const instance = await ethers.fhevm.createInstance();

    const option = await instance.userDecryptEuint8(vote.encryptedOption, signer.address);
    const weight = await instance.userDecryptEuint8(vote.encryptedWeight, signer.address);

    console.log(`\n🗳️  Your Vote:`);
    console.log(`  Option: ${option}`);
    console.log(`  Weight: ${weight}`);
  });

task("voting:list-proposals", "List all proposals")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const PrivateVotingDAO = await deployments.get("PrivateVotingDAO");
    const contract = await ethers.getContractAt("PrivateVotingDAO", PrivateVotingDAO.address);

    const count = await contract.proposalCount();
    console.log(`\n📋 Total Proposals: ${count}\n`);

    for (let i = 1; i <= count; i++) {
      const proposal = await contract.getProposal(i);
      console.log(`Proposal #${i}:`);
      console.log(`  Title: ${proposal.title}`);
      console.log(`  Status: ${["Active", "Ended", "Cancelled"][proposal.status]}`);
      console.log(`  Options: ${proposal.optionCount}`);
      console.log(`  End Time: ${new Date(Number(proposal.endTime) * 1000).toISOString()}`);
      console.log("");
    }
  });

