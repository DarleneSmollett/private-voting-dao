"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useMetaMaskEthersSigner } from "./metamask/useMetaMaskEthersSigner";
import { useInMemoryStorage } from "./useInMemoryStorage";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import type { Proposal, VoteData, DecryptedResults } from "@/lib/types";

export function usePrivateVotingDAOV2(parameters: {
  contractAddress: `0x${string}` | undefined;
  contractABI: any;
}) {
  const { contractAddress, contractABI } = parameters;
  const {
    signer,
    readonlyProvider,
    fhevmInstance,
    isFhevmLoading,
    account,
    chainId,
    sameChainRef,
    sameSignerRef,
  } = useMetaMaskEthersSigner();
  
  const storage = useInMemoryStorage();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalOptions, setProposalOptions] = useState<Map<number, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Get contract instance
  const getReadContract = useCallback(() => {
    if (!contractAddress || !readonlyProvider) return undefined;
    return new ethers.Contract(contractAddress, contractABI, readonlyProvider);
  }, [contractAddress, contractABI, readonlyProvider]);

  const getWriteContract = useCallback(() => {
    if (!contractAddress || !signer) return undefined;
    return new ethers.Contract(contractAddress, contractABI, signer);
  }, [contractAddress, contractABI, signer]);

  // Load all proposals
  const loadProposals = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;

    try {
      setIsLoading(true);
      const count = await contract.proposalCount();
      const proposalList: Proposal[] = [];
      const optionsMap = new Map<number, string[]>();

      for (let i = 1; i <= Number(count); i++) {
        const proposal = await contract.getProposal(i);
        const options = await contract.getProposalOptions(i);
        
        proposalList.push({
          id: proposal.id,
          title: proposal.title,
          description: proposal.description,
          proposer: proposal.proposer,
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          optionCount: options.length,
          resultStrategy: Number(proposal.resultStrategy),
          status: Number(proposal.status),
          resultsRevealed: proposal.resultsRevealed,
        });

        optionsMap.set(i, options);
      }

      setProposals(proposalList);
      setProposalOptions(optionsMap);
    } catch (e: any) {
      setMessage(`Failed to load proposals: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [getReadContract]);

  // Create proposal
  const createProposal = useCallback(
    async (
      title: string,
      description: string,
      options: string[],
      durationSeconds: number,
      resultStrategy: number
    ) => {
      const contract = getWriteContract();
      if (!contract) {
        setMessage("Contract not available");
        return;
      }

      try {
        setIsLoading(true);
        setMessage("Creating proposal...");

        const tx = await contract.createProposal(
          title,
          description,
          options,
          durationSeconds,
          resultStrategy
        );

        setMessage("Waiting for transaction confirmation...");
        await tx.wait();

        setMessage("Proposal created successfully!");
        await loadProposals();
      } catch (e: any) {
        setMessage(`Failed to create proposal: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [getWriteContract, loadProposals]
  );

  // Cast vote
  const castVote = useCallback(
    async (proposalId: number, voteData: VoteData) => {
      const contract = getWriteContract();
      if (!contract || !fhevmInstance || !account || !signer) {
        setMessage("Prerequisites not met for voting");
        return;
      }

      try {
        setIsLoading(true);
        setMessage("Encrypting vote...");

        // Encrypt option using createEncryptedInput
        const encryptedOption = await fhevmInstance
          .createEncryptedInput(contractAddress!, signer.address)
          .add8(voteData.option)
          .encrypt();

        setMessage("Submitting vote...");
        const tx = await contract.castVote(
          proposalId,
          encryptedOption.handles[0],
          encryptedOption.inputProof
        );

        setMessage("Waiting for transaction confirmation...");
        await tx.wait();

        setMessage("Vote cast successfully!");
        await loadProposals();
      } catch (e: any) {
        setMessage(`Failed to cast vote: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [getWriteContract, fhevmInstance, account, signer, contractAddress, loadProposals]
  );

  // End proposal (for expired proposals)
  const endProposal = useCallback(
    async (proposalId: number) => {
      const contract = getWriteContract();
      if (!contract) {
        setMessage("Contract not available");
        return;
      }

      try {
        setIsLoading(true);
        setMessage("Ending proposal...");

        const tx = await contract.endProposal(proposalId);

        setMessage("Waiting for transaction confirmation...");
        await tx.wait();

        setMessage("Proposal ended successfully!");
        await loadProposals();
      } catch (e: any) {
        setMessage(`Failed to end proposal: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [getWriteContract, loadProposals]
  );

  // Force end proposal (early termination by proposer or admin)
  const forceEndProposal = useCallback(
    async (proposalId: number) => {
      const contract = getWriteContract();
      if (!contract) {
        setMessage("Contract not available");
        return;
      }

      try {
        setIsLoading(true);
        setMessage("Force ending proposal...");

        const tx = await contract.forceEndProposal(proposalId);

        setMessage("Waiting for transaction confirmation...");
        await tx.wait();

        setMessage("Proposal force ended successfully!");
        await loadProposals();
      } catch (e: any) {
        setMessage(`Failed to force end proposal: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [getWriteContract, loadProposals]
  );

  // Allow results access
  const allowResultsAccess = useCallback(
    async (proposalId: number) => {
      const contract = getWriteContract();
      if (!contract) {
        setMessage("Contract not available");
        return;
      }

      try {
        setIsLoading(true);
        setMessage("Requesting results access...");

        const tx = await contract.allowResultsAccess(proposalId);

        setMessage("Waiting for transaction confirmation...");
        await tx.wait();

        setMessage("Results access granted!");
        await loadProposals();
      } catch (e: any) {
        setMessage(`Failed to allow results access: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [getWriteContract, loadProposals]
  );

  // Decrypt results
  const decryptResults = useCallback(
    async (proposalId: number, optionCount: number): Promise<DecryptedResults | undefined> => {
      const contract = getReadContract();
      if (!contract || !fhevmInstance || !signer) {
        setMessage("Prerequisites not met for decryption");
        return undefined;
      }

      try {
        setIsLoading(true);
        setMessage("Getting decryption signature...");

        const sig = await FhevmDecryptionSignature.loadOrSign(
          fhevmInstance,
          [contractAddress!],
          signer,
          storage
        );

        if (!sig) {
          setMessage("Failed to get decryption signature");
          return undefined;
        }

        setMessage("Fetching encrypted results...");

        // Get total voters handle
        const totalVotersHandle = await contract.getTotalVoters(proposalId);

        // Get option votes handles
        const handles: Array<{ handle: string; contractAddress: string }> = [
          { handle: totalVotersHandle, contractAddress: contractAddress! },
        ];

        for (let i = 0; i < optionCount; i++) {
          const optionHandle = await contract.getOptionVotes(proposalId, i);
          handles.push({ handle: optionHandle, contractAddress: contractAddress! });
        }

        setMessage("Decrypting results...");

        // Decrypt all handles
        const decryptedValues = await fhevmInstance.userDecrypt(
          handles,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        const totalVoters = BigInt(decryptedValues[totalVotersHandle] as bigint);
        const optionVotes: bigint[] = [];

        for (let i = 0; i < optionCount; i++) {
          const optionHandle = await contract.getOptionVotes(proposalId, i);
          optionVotes.push(BigInt(decryptedValues[optionHandle] as bigint));
        }

        setMessage("Results decrypted successfully!");
        return { optionVotes, totalVoters };
      } catch (e: any) {
        setMessage(`Failed to decrypt results: ${e.message}`);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [getReadContract, fhevmInstance, signer, storage, contractAddress]
  );

  // Check if user has voted
  const hasVoted = useCallback(
    async (proposalId: number, voter: string): Promise<boolean> => {
      const contract = getReadContract();
      if (!contract) return false;

      try {
        return await contract.hasVoted(proposalId, voter);
      } catch (e: any) {
        return false;
      }
    },
    [getReadContract]
  );

  // Load proposals on mount
  useEffect(() => {
    if (contractAddress && readonlyProvider) {
      loadProposals();
    }
  }, [contractAddress, readonlyProvider, loadProposals]);

  return {
    proposals,
    proposalOptions,
    isLoading: isLoading || isFhevmLoading,
    message,
    createProposal,
    castVote,
    endProposal,
    forceEndProposal,
    allowResultsAccess,
    decryptResults,
    hasVoted,
    loadProposals,
    account,
    fhevmInstance,
  };
}

