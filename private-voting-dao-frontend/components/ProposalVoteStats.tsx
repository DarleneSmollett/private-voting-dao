"use client";

import { useState, useEffect } from "react";
import type { DecryptedResults } from "@/lib/types";

type Props = {
  proposalId: number;
  options: string[];
  isEnded: boolean;
  resultsRevealed: boolean;
  onRequestAccess: () => void;
  onDecryptResults: () => Promise<DecryptedResults | undefined>;
  isLoading: boolean;
};

export function ProposalVoteStats({
  proposalId,
  options,
  isEnded,
  resultsRevealed,
  onRequestAccess,
  onDecryptResults,
  isLoading,
}: Props) {
  const [decryptedResults, setDecryptedResults] = useState<DecryptedResults | undefined>();
  const [showStats, setShowStats] = useState(false);

  const handleDecrypt = async () => {
    const results = await onDecryptResults();
    if (results) {
      setDecryptedResults(results);
    }
  };

  // 计算百分比
  const calculatePercentage = (votes: bigint, total: bigint): number => {
    if (total === BigInt(0)) return 0;
    return Number((votes * BigInt(100)) / total);
  };

  // 找出获胜选项
  const getWinningOptions = (): number[] => {
    if (!decryptedResults) return [];
    const maxVotes = decryptedResults.optionVotes.reduce(
      (max, votes) => (votes > max ? votes : max),
      BigInt(0)
    );
    return decryptedResults.optionVotes
      .map((votes, index) => (votes === maxVotes ? index : -1))
      .filter((index) => index !== -1);
  };

  const winningOptions = getWinningOptions();

  return (
    <div className="space-y-4">
      {/* 统计面板切换按钮 */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="w-full btn-secondary flex items-center justify-between"
      >
        <span>📊 投票统计 | Vote Statistics</span>
        <span className="text-2xl">{showStats ? "▼" : "▶"}</span>
      </button>

      {/* 统计详情 */}
      {showStats && (
        <div className="bg-white/5 rounded-xl p-6 space-y-6 border border-white/10">
          {!isEnded && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔒</div>
              <div className="text-yellow-300 font-semibold mb-2">
                投票进行中 | Voting In Progress
              </div>
              <div className="text-sm text-gray-400">
                提案结束后才能查看统计结果
              </div>
            </div>
          )}

          {isEnded && !resultsRevealed && (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🔐</div>
              <div className="text-blue-300 font-semibold mb-4">
                需要授权访问结果 | Access Required
              </div>
              <button
                onClick={onRequestAccess}
                disabled={isLoading}
                className="btn-primary"
              >
                🔓 请求访问权限 | Request Access
              </button>
            </div>
          )}

          {isEnded && resultsRevealed && !decryptedResults && (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🔑</div>
              <div className="text-green-300 font-semibold mb-4">
                准备解密结果 | Ready to Decrypt
              </div>
              <button
                onClick={handleDecrypt}
                disabled={isLoading}
                className="btn-primary"
              >
                🔐 解密查看结果 | Decrypt Results
              </button>
            </div>
          )}

          {decryptedResults && (
            <div className="space-y-6">
              {/* 总体统计 */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-5 border border-blue-500/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  📈 总体统计 | Overall Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {decryptedResults.totalVoters.toString()}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">总投票数 | Total Votes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {options.length}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">投票选项 | Options</div>
                  </div>
                </div>
              </div>

              {/* 详细结果 */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  🎯 投票结果 | Voting Results
                </h3>
                <div className="space-y-4">
                  {decryptedResults.optionVotes.map((votes, index) => {
                    const percentage = calculatePercentage(votes, decryptedResults.totalVoters);
                    const isWinner = winningOptions.includes(index);
                    
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-xl transition-all ${
                          isWinner
                            ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 ring-2 ring-yellow-500/30"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {isWinner && <span className="text-2xl">🏆</span>}
                            <span className="text-white font-semibold text-lg">
                              {options[index] || `选项 ${index}`}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-white">
                              {votes.toString()} 票
                            </div>
                            <div className="text-sm text-gray-400">
                              {percentage}%
                            </div>
                          </div>
                        </div>
                        
                        {/* 进度条 */}
                        <div className="vote-bar">
                          <div
                            className={`vote-bar-fill ${
                              isWinner
                                ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                : ""
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        
                        {isWinner && (
                          <div className="mt-2 text-center text-yellow-300 text-sm font-semibold animate-pulse">
                            ⭐ 获胜选项 | Winner ⭐
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 投票分布饼图（文字版） */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  📊 投票分布 | Vote Distribution
                </h3>
                <div className="space-y-2">
                  {decryptedResults.optionVotes.map((votes, index) => {
                    const percentage = calculatePercentage(votes, decryptedResults.totalVoters);
                    return (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <div className="w-24 text-gray-400 truncate">
                          {options[index] || `选项 ${index}`}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-gray-300 w-12 text-right">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 统计摘要 */}
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-gray-400 mb-1">最高得票</div>
                  <div className="text-white font-bold">
                    {Math.max(...decryptedResults.optionVotes.map(v => Number(v)))} 票
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-gray-400 mb-1">最低得票</div>
                  <div className="text-white font-bold">
                    {Math.min(...decryptedResults.optionVotes.map(v => Number(v)))} 票
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-gray-400 mb-1">平均票数</div>
                  <div className="text-white font-bold">
                    {(Number(decryptedResults.totalVoters) / options.length).toFixed(1)} 票
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

