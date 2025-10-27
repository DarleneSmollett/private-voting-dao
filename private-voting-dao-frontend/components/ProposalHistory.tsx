"use client";

import { Proposal, ProposalStatus } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

type Props = {
  proposals: Proposal[];
};

export function ProposalHistory({ proposals }: Props) {
  const stats = {
    total: proposals.length,
    active: proposals.filter(p => p.status === ProposalStatus.Active).length,
    ended: proposals.filter(p => p.status === ProposalStatus.Ended).length,
    cancelled: proposals.filter(p => p.status === ProposalStatus.Cancelled).length,
  };

  return (
    <div className="card-glass p-6 space-y-6 fade-in">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        📜 提案历史 | Proposal History
      </h2>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-sm text-gray-400 mt-1">总提案</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{stats.active}</div>
          <div className="text-sm text-gray-400 mt-1">进行中</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{stats.ended}</div>
          <div className="text-sm text-gray-400 mt-1">已结束</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-400">{stats.cancelled}</div>
          <div className="text-sm text-gray-400 mt-1">已取消</div>
        </div>
      </div>

      {/* Recent Proposals */}
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {proposals.slice(0, 10).map((proposal) => (
          <div
            key={proposal.id.toString()}
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-white">{proposal.title}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {formatTimestamp(Number(proposal.startTime))}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`status-badge ${
                    proposal.status === ProposalStatus.Active
                      ? "status-active"
                      : proposal.status === ProposalStatus.Ended
                      ? "status-ended"
                      : "status-cancelled"
                  }`}
                >
                  {proposal.status === ProposalStatus.Active
                    ? "进行中"
                    : proposal.status === ProposalStatus.Ended
                    ? "已结束"
                    : "已取消"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

