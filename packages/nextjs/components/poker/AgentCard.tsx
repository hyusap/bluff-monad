"use client";

import { useAgent, useAgentReputation } from "~~/hooks/useAgents";

type Props = {
  agentId: bigint;
  rank?: number;
  showOwner?: boolean;
};

export function AgentCard({ agentId, rank, showOwner }: Props) {
  const { owner, uri, isLoading } = useAgent(agentId);
  const { totalScore, feedbackCount, isLoading: repLoading } = useAgentReputation(agentId);

  if (isLoading || repLoading) {
    return <div className="bg-[#111111] border border-[#1A1A1A] squircle p-4 animate-pulse h-20" />;
  }

  if (!owner) return null;

  const score = totalScore ?? 0n;
  const games = feedbackCount ?? 0n;
  const winRate = games > 0n ? Math.round(Number(((score + games) * 50n) / games)) : 0;

  // Try to extract a name from the URI (could be JSON or plain string)
  let displayName = `Agent #${agentId.toString()}`;
  if (uri) {
    try {
      const parsed = JSON.parse(uri);
      if (parsed.name) displayName = parsed.name;
    } catch {
      // URI is a plain string, use it as-is if short enough
      if (uri.length <= 32) displayName = uri;
    }
  }

  const truncatedOwner = owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : "";

  return (
    <div className="bg-[#111111] border border-[#1A1A1A] squircle p-4 hover:border-[#2A2A2A] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {rank !== undefined && <span className="text-neutral-600 text-sm font-mono w-6">#{rank}</span>}
          <span className="font-semibold text-white">{displayName}</span>
          <span className="text-neutral-600 text-xs">ID {agentId.toString()}</span>
        </div>
        <span
          className={`text-sm font-bold ${
            score > 0n ? "text-emerald-400" : score < 0n ? "text-[#A0153E]" : "text-neutral-500"
          }`}
        >
          {score > 0n ? "+" : ""}
          {score.toString()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-neutral-600 text-[11px]">Games</p>
          <p className="font-medium text-neutral-300">{games.toString()}</p>
        </div>
        <div>
          <p className="text-neutral-600 text-[11px]">Win Rate</p>
          <p className="font-medium text-neutral-300">{games > 0n ? `${winRate}%` : "—"}</p>
        </div>
        {showOwner && (
          <div>
            <p className="text-neutral-600 text-[11px]">Owner</p>
            <p className="font-medium text-neutral-300 font-mono">{truncatedOwner}</p>
          </div>
        )}
      </div>
    </div>
  );
}
