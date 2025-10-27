"use client";

import { useState } from "react";
import type { Proposal, DecryptedResults } from "@/lib/types";
import { ProposalStatus, ResultStrategy } from "@/lib/types";
import { formatAddress, formatTimestamp } from "@/lib/utils";
import { ProposalVoteStats } from "./ProposalVoteStats";

type Props = {
  proposal: Proposal;
  hasVoted: boolean;
  canVote: boolean;
  onVote: (proposalId: number, voteData: { option: number }) => void;
  onEnd: (proposalId: number) => void;
  onForceEnd: (proposalId: number) => void;
  onAllowResults: (proposalId: number) => void;
  onDecryptResults: (proposalId: number, optionCount: number) => Promise<DecryptedResults | undefined>;
  isLoading: boolean;
  options?: string[];
  currentUserAddress?: string;
};

export function ProposalCardV2({
  proposal,
  hasVoted,
  canVote,
  onVote,
  onEnd,
  onForceEnd,
  onAllowResults,
  onDecryptResults,
  isLoading,
  options = [],
  currentUserAddress,
}: Props) {
  const [selectedOption, setSelectedOption] = useState(0);
  const [showVoteForm, setShowVoteForm] = useState(false);

  const handleVote = () => {
    onVote(Number(proposal.id), { option: selectedOption });
    setShowVoteForm(false);
  };

  const isEnded = proposal.status === ProposalStatus.Ended;
  const isCancelled = proposal.status === ProposalStatus.Cancelled;
  const isActive = proposal.status === ProposalStatus.Active;
  const isExpired = Number(proposal.endTime) * 1000 < Date.now();

  const getStatusText = () => {
    if (isCancelled) return "已取消";
    if (isEnded) return "已结束";
    if (isExpired) return "已过期";
    return "进行中";
  };

  const getStatusClass = () => {
    if (isCancelled) return "status-cancelled";
    if (isEnded) return "status-ended";
    if (isExpired) return "bg-orange-500/20 text-orange-300 border border-orange-500/30";
    return "status-active";
  };

  const getResultStrategyText = (strategy: ResultStrategy) => {
    switch (strategy) {
      case ResultStrategy.PublicOnEnd: return "📢 公开";
      case ResultStrategy.PrivateToOwner: return "👤 提案者";
      case ResultStrategy.PrivateToDAO: return "🏛️ DAO";
    }
  };

  return (
    <div className="proposal-card fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-white">{proposal.title}</h3>
            <span className={`status-badge ${getStatusClass()}`}>
              {getStatusText()}
            </span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">{proposal.description}</p>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              👤 {formatAddress(proposal.proposer)}
            </span>
            <span className="flex items-center gap-1">
              ✅ {options.length || proposal.optionCount} 个选项
            </span>
            <span className="flex items-center gap-1">
              {getResultStrategyText(proposal.resultStrategy)}
            </span>
          </div>
          
          <div className="flex gap-4 text-sm text-gray-500 mt-2">
            <span>🕐 开始: {formatTimestamp(Number(proposal.startTime))}</span>
            <span>⏰ 结束: {formatTimestamp(Number(proposal.endTime))}</span>
          </div>
        </div>
      </div>

      {/* Vote Form */}
      {isActive && !isExpired && !hasVoted && canVote && (
        <div className="border-t border-white/10 pt-4 mt-4">
          {!showVoteForm ? (
            <button
              onClick={() => setShowVoteForm(true)}
              disabled={isLoading}
              className="btn-secondary w-full"
            >
              🗳️ 投票 | Vote
            </button>
          ) : (
            <div className="space-y-4 bg-white/5 rounded-xl p-4">
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  选择投票选项 | Select Option
                </label>
                <div className="space-y-2">
                  {options.map((option, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedOption === i
                          ? "bg-blue-500/30 border-2 border-blue-500"
                          : "bg-white/5 border-2 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="option"
                        value={i}
                        checked={selectedOption === i}
                        onChange={() => setSelectedOption(i)}
                        className="w-5 h-5 text-blue-500"
                      />
                      <span className="text-white font-medium">{option || `选项 ${i}`}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleVote}
                  disabled={isLoading}
                  className="btn-primary flex-1"
                >
                  ✅ 确认投票 | Submit
                </button>
                <button
                  onClick={() => setShowVoteForm(false)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 rounded-xl transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {hasVoted && (
        <div className="text-green-400 text-sm flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/30">
          <span className="text-lg">✅</span>
          您已投票 | You have voted
        </div>
      )}

      {/* Force End Proposal Button (for proposer or admin) */}
      {isActive && !isExpired && currentUserAddress && 
       currentUserAddress.toLowerCase() === proposal.proposer.toLowerCase() && (
        <div className="border-t border-white/10 pt-4 mt-4">
          <button
            onClick={() => onForceEnd(Number(proposal.id))}
            disabled={isLoading}
            className="btn-danger w-full flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>提前结束投票 | Force End</span>
            <span className="text-sm opacity-75">(测试用)</span>
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            仅提案创建者可提前结束 | Only proposer can force end
          </p>
        </div>
      )}

      {/* End Proposal Button (for expired proposals) */}
      {isActive && isExpired && !isEnded && (
        <button
          onClick={() => onEnd(Number(proposal.id))}
          disabled={isLoading}
          className="btn-danger w-full mt-4"
        >
          🏁 结束提案 | End Proposal
        </button>
      )}

      {/* Vote Statistics Section */}
      <div className="border-t border-white/10 pt-4 mt-4">
        <ProposalVoteStats
          proposalId={Number(proposal.id)}
          options={options}
          isEnded={isEnded}
          resultsRevealed={proposal.resultsRevealed}
          onRequestAccess={() => onAllowResults(Number(proposal.id))}
          onDecryptResults={async () => {
            const results = await onDecryptResults(Number(proposal.id), options.length || proposal.optionCount);
            return results;
          }}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

