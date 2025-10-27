"use client";

import { Proposal } from "@/lib/types";
import { formatAddress } from "@/lib/utils";

type Props = {
  proposals: Proposal[];
  userAddress?: string;
  votedProposalIds: Set<number>;
};

export function VotingStats({ proposals, userAddress, votedProposalIds }: Props) {
  const myVotes = proposals.filter(p => votedProposalIds.has(Number(p.id)));
  const participationRate = proposals.length > 0 
    ? Math.round((myVotes.length / proposals.length) * 100) 
    : 0;

  return (
    <div className="card-glass p-6 space-y-6 fade-in">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
        📊 投票统计 | Voting Statistics
      </h2>

      {userAddress ? (
        <>
          {/* User Stats */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-5 border border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <div className="text-sm text-gray-400">当前地址</div>
                <div className="font-mono text-white">{formatAddress(userAddress)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-400">{myVotes.length}</div>
                <div className="text-sm text-gray-400">我的投票</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">{participationRate}%</div>
                <div className="text-sm text-gray-400">参与率</div>
              </div>
            </div>
          </div>

          {/* My Voting History */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              🗳️ 我的投票历史
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {myVotes.length > 0 ? (
                myVotes.map((proposal) => (
                  <div
                    key={proposal.id.toString()}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white text-sm">
                          {proposal.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          提案 #{proposal.id.toString()}
                        </div>
                      </div>
                      <div className="text-green-400 text-xl">✓</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🗳️</div>
                  <div className="text-sm">您还没有参与投票</div>
                  <div className="text-xs mt-1">快去为提案投票吧！</div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🔌</div>
          <div className="text-sm">请先连接钱包</div>
          <div className="text-xs mt-1">连接后查看您的投票统计</div>
        </div>
      )}
    </div>
  );
}

