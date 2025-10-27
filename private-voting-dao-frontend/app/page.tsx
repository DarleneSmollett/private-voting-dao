"use client";

import { useEffect, useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { CreateProposalFormV2 } from "@/components/CreateProposalFormV2";
import { ProposalCardV2 } from "@/components/ProposalCardV2";
import { ProposalHistory } from "@/components/ProposalHistory";
import { VotingStats } from "@/components/VotingStats";
import { usePrivateVotingDAOV2 } from "@/hooks/usePrivateVotingDAOV2";
import { PRIVATE_VOTING_DAO_V2_ABI } from "@/abi/PrivateVotingDAOV2ABI";
import { PRIVATE_VOTING_DAO_V2_ADDRESS } from "@/abi/PrivateVotingDAOV2Addresses";

export default function HomePage() {
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);

  // 在客户端挂载后获取合约地址，避免 SSR Hydration 不匹配
  useEffect(() => {
    setIsMounted(true);
    setContractAddress(PRIVATE_VOTING_DAO_V2_ADDRESS());
  }, []);
  const {
    proposals,
    proposalOptions,
    isLoading,
    message,
    createProposal,
    castVote,
    endProposal,
    forceEndProposal,
    allowResultsAccess,
    decryptResults,
    hasVoted: checkHasVoted,
    account,
    fhevmInstance,
  } = usePrivateVotingDAOV2({
    contractAddress,
    contractABI: PRIVATE_VOTING_DAO_V2_ABI,
  });

  const [votedProposals, setVotedProposals] = useState<Set<number>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load voted proposals status
  useEffect(() => {
    if (!account) return;

    const loadVotedStatus = async () => {
      const voted = new Set<number>();
      for (const proposal of proposals) {
        const hasVoted = await checkHasVoted(Number(proposal.id), account);
        if (hasVoted) {
          voted.add(Number(proposal.id));
        }
      }
      setVotedProposals(voted);
    };

    loadVotedStatus();
  }, [proposals, account, checkHasVoted]);

  const isContractDeployed = !!contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000";

  // 避免 SSR Hydration 不匹配，在客户端挂载前显示加载状态
  if (!isMounted) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="bg-decoration" />
        <div className="text-center relative z-10">
          <div className="text-6xl mb-4 animate-pulse">🏛️</div>
          <div className="text-xl text-gray-300">正在加载...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background decoration */}
      <div className="bg-decoration" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                🏛️ 隐私投票 DAO
              </h1>
              <p className="text-gray-400 text-lg">
                Privacy Voting DAO - Powered by FHEVM
              </p>
            </div>
            <WalletConnect />
          </div>

          {/* Status indicators */}
          <div className="card-glass p-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">钱包连接 | Wallet:</span>
              {account ? (
                <span className="text-green-400 flex items-center gap-2">
                  ✅ 已连接 | Connected
                </span>
              ) : (
                <span className="text-yellow-400 flex items-center gap-2">
                  ⚠️ 未连接 | Not Connected
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-gray-400">FHEVM 实例 | Instance:</span>
              {fhevmInstance ? (
                <span className="text-green-400 flex items-center gap-2">
                  ✅ 已初始化 | Initialized
                </span>
              ) : (
                <span className="text-yellow-400 flex items-center gap-2">
                  ⏳ 初始化中... | Initializing...
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-400">智能合约 | Contract:</span>
              {isContractDeployed ? (
                <span className="text-green-400 flex items-center gap-2">
                  ✅ 已部署 | Deployed
                </span>
              ) : (
                <span className="text-red-400 flex items-center gap-2">
                  ❌ 未部署 | Not Deployed
                </span>
              )}
            </div>
          </div>
        </header>

        {!isContractDeployed && (
          <div className="card-glass p-6 mb-8 border-red-500/50">
            <h2 className="text-xl font-bold text-red-400 mb-2">❌ 合约未部署</h2>
            <p className="text-gray-300 mb-4">
              PrivateVotingDAOV2 合约尚未部署，请先部署合约。
            </p>
            <p className="text-sm text-gray-400 font-mono">
              cd fhevm-hardhat-template && npx hardhat deploy --tags PrivateVotingDAOV2
            </p>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className="card-glass p-4 mb-8 border-blue-500/50 pulse-glow">
            <p className="text-blue-300 flex items-center gap-2">
              <span className="animate-pulse">ℹ️</span>
              {message}
            </p>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Create Form and Active Proposals */}
          <div className="lg:col-span-2 space-y-8">
            {/* Create Proposal Toggle */}
            <div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                disabled={!account || !fhevmInstance || !isContractDeployed}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showCreateForm ? "❌ 取消创建" : "➕ 创建新提案"}
              </button>
            </div>

            {/* Create Proposal Form */}
            {showCreateForm && (
              <CreateProposalFormV2
                onSubmit={(title, description, options, durationSeconds, resultStrategy) => {
                  createProposal(title, description, options, durationSeconds, resultStrategy);
                  setShowCreateForm(false);
                }}
                isLoading={isLoading}
              />
            )}

            {/* Active Proposals */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                🗳️ 活跃提案
                <span className="text-lg text-gray-400">({proposals.length})</span>
              </h2>

              {proposals.length === 0 ? (
                <div className="card-glass p-12 text-center">
                  <div className="text-6xl mb-4">🗳️</div>
                  <p className="text-gray-400 text-lg">暂无提案</p>
                  <p className="text-gray-500 text-sm mt-2">快来创建第一个提案吧！</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {proposals.map((proposal) => (
                    <ProposalCardV2
                      key={proposal.id.toString()}
                      proposal={proposal}
                      hasVoted={votedProposals.has(Number(proposal.id))}
                      canVote={!!account && !!fhevmInstance}
                      onVote={castVote}
                      onEnd={endProposal}
                      onForceEnd={forceEndProposal}
                      onAllowResults={allowResultsAccess}
                      onDecryptResults={decryptResults}
                      isLoading={isLoading}
                      options={proposalOptions.get(Number(proposal.id)) || []}
                      currentUserAddress={account}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats and History */}
          <div className="space-y-8">
            <VotingStats
              proposals={proposals}
              userAddress={account}
              votedProposalIds={votedProposals}
            />
            <ProposalHistory proposals={proposals} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <div className="card-glass p-6">
            <p className="mb-2">
              🔒 基于 FHEVM 的端到端加密投票系统
            </p>
            <p>
              Built with ❤️ using Zama&apos;s Fully Homomorphic Encryption
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

