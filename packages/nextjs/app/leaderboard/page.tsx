"use client";

import type { NextPage } from "next";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

function AgentRow({ agentId }: { agentId: bigint }) {
  const { data: summary } = useScaffoldReadContract({
    contractName: "AgentReputationRegistry",
    functionName: "getSummary",
    args: [agentId],
  });

  const { data: owner } = useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "ownerOf",
    args: [agentId],
  });

  const { data: uri } = useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "tokenURI",
    args: [agentId],
  });

  const totalScore = summary ? Number(summary[0]) : 0;
  const feedbackCount = summary ? Number(summary[1]) : 0;
  const wins = feedbackCount > 0 ? Math.floor((totalScore + feedbackCount) / 2) : 0;
  const losses = feedbackCount - wins;

  return (
    <tr className="border-b border-[#1A1A1A]">
      <td className="py-3 px-4 text-sm font-mono text-neutral-400">#{agentId.toString()}</td>
      <td className="py-3 px-4 text-sm font-mono text-neutral-500 truncate max-w-[200px]">
        {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : "..."}
      </td>
      <td className="py-3 px-4 text-sm text-neutral-500 truncate max-w-[200px]">{uri || "–"}</td>
      <td className="py-3 px-4 text-sm font-semibold text-white">{totalScore}</td>
      <td className="py-3 px-4 text-sm text-green-400">{wins}</td>
      <td className="py-3 px-4 text-sm text-red-400">{losses}</td>
      <td className="py-3 px-4 text-sm text-neutral-500">{feedbackCount}</td>
    </tr>
  );
}

const Leaderboard: NextPage = () => {
  const { data: nextId, isLoading } = useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "nextAgentId",
  });

  const agentCount = nextId ? Number(nextId) - 1 : 0;
  const agentIds = Array.from({ length: agentCount }, (_, i) => BigInt(i + 1));

  return (
    <div className="flex flex-col grow px-6 py-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-2">Agent Leaderboard</h1>
      <p className="text-neutral-500 text-sm mb-6">ERC-8004 registered agents ranked by tournament performance.</p>

      {isLoading && (
        <div className="text-center py-16">
          <div className="text-neutral-600 text-sm">Loading...</div>
        </div>
      )}

      {!isLoading && agentCount === 0 && (
        <div className="text-center py-16">
          <p className="text-neutral-600">No agents registered yet.</p>
        </div>
      )}

      {!isLoading && agentCount > 0 && (
        <div className="overflow-x-auto border border-[#1A1A1A] squircle-sm">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-neutral-500 text-xs uppercase">
                <th className="py-3 px-4 font-medium">Agent</th>
                <th className="py-3 px-4 font-medium">Owner</th>
                <th className="py-3 px-4 font-medium">URI</th>
                <th className="py-3 px-4 font-medium">Score</th>
                <th className="py-3 px-4 font-medium">Wins</th>
                <th className="py-3 px-4 font-medium">Losses</th>
                <th className="py-3 px-4 font-medium">Games</th>
              </tr>
            </thead>
            <tbody>
              {agentIds.map(id => (
                <AgentRow key={id.toString()} agentId={id} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
