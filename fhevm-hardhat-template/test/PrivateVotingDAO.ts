import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { PrivateVotingDAO } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: any;
  bob: any;
  carol: any;
};

describe("PrivateVotingDAO", function () {
  let contract: PrivateVotingDAO;
  let signers: Signers;

  before(async function () {
    signers = {} as Signers;
    const accounts = await ethers.getSigners();
    signers.alice = accounts[0];
    signers.bob = accounts[1];
    signers.carol = accounts[2];
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    const contractFactory = await ethers.getContractFactory("PrivateVotingDAO");
    contract = await contractFactory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      const address = await contract.getAddress();
      expect(address).to.be.properAddress;
    });

    it("should set deployer as DAO admin", async function () {
      const admin = await contract.daoAdmin();
      expect(admin).to.equal(signers.alice.address);
    });

    it("should initialize with proposalCount = 0", async function () {
      const count = await contract.proposalCount();
      expect(count).to.equal(0);
    });
  });

  describe("Proposal Creation", function () {
    it("should create a proposal successfully", async function () {
      const title = "Test Proposal";
      const description = "This is a test proposal";
      const optionCount = 3;
      const duration = 3600; // 1 hour
      const resultStrategy = 0; // PublicOnEnd

      const tx = await contract.createProposal(
        title,
        description,
        optionCount,
        duration,
        resultStrategy
      );

      await expect(tx)
        .to.emit(contract, "ProposalCreated")
        .withArgs(1, signers.alice.address, title, optionCount, await time(), await time() + duration, resultStrategy);

      const proposalCount = await contract.proposalCount();
      expect(proposalCount).to.equal(1);

      const proposal = await contract.getProposal(1);
      expect(proposal.title).to.equal(title);
      expect(proposal.description).to.equal(description);
      expect(proposal.optionCount).to.equal(optionCount);
      expect(proposal.proposer).to.equal(signers.alice.address);
      expect(proposal.status).to.equal(0); // Active
    });

    it("should reject proposal with invalid option count", async function () {
      await expect(
        contract.createProposal("Test", "Desc", 1, 3600, 0)
      ).to.be.revertedWith("Option count must be 2-10");

      await expect(
        contract.createProposal("Test", "Desc", 11, 3600, 0)
      ).to.be.revertedWith("Option count must be 2-10");
    });

    it("should reject proposal with zero duration", async function () {
      await expect(
        contract.createProposal("Test", "Desc", 3, 0, 0)
      ).to.be.revertedWith("Duration must be positive");
    });
  });

  describe("Voting", function () {
    let proposalId: number;
    let contractAddress: string;

    beforeEach(async function () {
      // Create a test proposal
      const tx = await contract.createProposal(
        "Test Proposal",
        "Description",
        3,
        3600,
        0
      );
      await tx.wait();
      proposalId = 1;
      contractAddress = await contract.getAddress();
    });

    it("should allow user to cast encrypted vote", async function () {
      // Create encrypted input for option (e.g., option 1)
      const encryptedOption = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(1)
        .encrypt();

      // Create encrypted input for weight (e.g., weight 10)
      const encryptedWeight = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(10)
        .encrypt();

      const tx = await contract.connect(signers.bob).castVote(
        proposalId,
        encryptedOption.handles[0],
        encryptedWeight.handles[0],
        encryptedOption.inputProof,
        encryptedWeight.inputProof
      );

      await expect(tx)
        .to.emit(contract, "VoteCast")
        .withArgs(proposalId, signers.bob.address);

      const hasVoted = await contract.hasVoted(proposalId, signers.bob.address);
      expect(hasVoted).to.be.true;
    });

    it("should reject duplicate votes", async function () {
      // Cast first vote
      const encryptedOption1 = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(1)
        .encrypt();

      const encryptedWeight1 = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(10)
        .encrypt();

      await contract.connect(signers.bob).castVote(
        proposalId,
        encryptedOption1.handles[0],
        encryptedWeight1.handles[0],
        encryptedOption1.inputProof,
        encryptedWeight1.inputProof
      );

      // Try to cast second vote
      const encryptedOption2 = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(2)
        .encrypt();

      const encryptedWeight2 = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(5)
        .encrypt();

      await expect(
        contract.connect(signers.bob).castVote(
          proposalId,
          encryptedOption2.handles[0],
          encryptedWeight2.handles[0],
          encryptedOption2.inputProof,
          encryptedWeight2.inputProof
        )
      ).to.be.revertedWith("Already voted");
    });

    it("should allow user to retrieve their own vote", async function () {
      // Cast vote
      const encryptedOption = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(2)
        .encrypt();

      const encryptedWeight = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(15)
        .encrypt();

      await contract.connect(signers.bob).castVote(
        proposalId,
        encryptedOption.handles[0],
        encryptedWeight.handles[0],
        encryptedOption.inputProof,
        encryptedWeight.inputProof
      );

      // Get vote
      const vote = await contract.connect(signers.bob).getMyVote(proposalId);
      expect(vote.encryptedOption).to.not.equal(ethers.ZeroHash);
      expect(vote.encryptedWeight).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Proposal Management", function () {
    let proposalId: number;

    beforeEach(async function () {
      const tx = await contract.createProposal(
        "Test Proposal",
        "Description",
        3,
        1, // 1 second duration for testing
        0
      );
      await tx.wait();
      proposalId = 1;
    });

    it("should allow ending proposal after voting period", async function () {
      // Wait for voting period to end
      await new Promise(resolve => setTimeout(resolve, 2000));

      const tx = await contract.endProposal(proposalId);
      await expect(tx)
        .to.emit(contract, "ProposalEnded")
        .withArgs(proposalId);

      const proposal = await contract.getProposal(proposalId);
      expect(proposal.status).to.equal(1); // Ended
    });

    it("should reject ending proposal before voting period ends", async function () {
      await expect(
        contract.endProposal(proposalId)
      ).to.be.revertedWith("Voting period not ended");
    });

    it("should allow proposer to cancel proposal", async function () {
      const tx = await contract.connect(signers.alice).cancelProposal(proposalId);
      await expect(tx)
        .to.emit(contract, "ProposalCancelled")
        .withArgs(proposalId);

      const proposal = await contract.getProposal(proposalId);
      expect(proposal.status).to.equal(2); // Cancelled
    });

    it("should allow admin to cancel proposal", async function () {
      const tx = await contract.connect(signers.alice).cancelProposal(proposalId);
      await expect(tx)
        .to.emit(contract, "ProposalCancelled")
        .withArgs(proposalId);
    });

    it("should reject non-authorized cancellation", async function () {
      await expect(
        contract.connect(signers.bob).cancelProposal(proposalId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Results Access Control", function () {
    let proposalId: number;
    let contractAddress: string;

    beforeEach(async function () {
      const tx = await contract.createProposal(
        "Test Proposal",
        "Description",
        2,
        1, // 1 second
        0 // PublicOnEnd
      );
      await tx.wait();
      proposalId = 1;
      contractAddress = await contract.getAddress();

      // Cast a vote
      const encryptedOption = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(1)
        .encrypt();

      const encryptedWeight = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add8(10)
        .encrypt();

      await contract.connect(signers.bob).castVote(
        proposalId,
        encryptedOption.handles[0],
        encryptedWeight.handles[0],
        encryptedOption.inputProof,
        encryptedWeight.inputProof
      );
    });

    it("should allow results access after proposal ends with PublicOnEnd strategy", async function () {
      // Wait for voting to end
      await new Promise(resolve => setTimeout(resolve, 2000));
      await contract.endProposal(proposalId);

      // Anyone should be able to request access
      await expect(
        contract.connect(signers.carol).allowResultsAccess(proposalId)
      ).to.not.be.reverted;
    });

    it("should reject results access before proposal ends", async function () {
      await expect(
        contract.connect(signers.carol).allowResultsAccess(proposalId)
      ).to.be.revertedWith("Proposal not ended");
    });
  });

  describe("Admin Functions", function () {
    it("should allow admin to set new admin", async function () {
      await contract.connect(signers.alice).setDaoAdmin(signers.bob.address);
      const newAdmin = await contract.daoAdmin();
      expect(newAdmin).to.equal(signers.bob.address);
    });

    it("should reject non-admin from setting admin", async function () {
      await expect(
        contract.connect(signers.bob).setDaoAdmin(signers.carol.address)
      ).to.be.revertedWith("Only DAO admin");
    });

    it("should allow admin to set min quorum", async function () {
      await contract.connect(signers.alice).setMinQuorum(100);
      const quorum = await contract.minQuorum();
      expect(quorum).to.equal(100);
    });
  });
});

async function time(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

