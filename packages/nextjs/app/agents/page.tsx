"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { AgentCard } from "~~/components/poker/AgentCard";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { Label } from "~~/components/ui/label";
import { Textarea } from "~~/components/ui/textarea";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useAgent, useAgentCount, useAgentReputation } from "~~/hooks/useAgents";

// ── Leaderboard row that exposes sort data via callback ──
function LeaderboardEntry({ agentId, onData }: { agentId: bigint; onData: (agentId: bigint, score: bigint) => void }) {
  const { totalScore } = useAgentReputation(agentId);
  // Report score up for sorting
  const score = totalScore ?? 0n;
  useMemo(() => onData(agentId, score), [agentId, score, onData]);
  return null; // Rendering handled by parent after sort
}

// ── My Agent row (only renders if owned by connected wallet) ──
function MyAgentRow({ agentId, connectedAddress }: { agentId: bigint; connectedAddress: string }) {
  const { owner, isLoading } = useAgent(agentId);
  if (isLoading) return null;
  if (!owner || owner.toLowerCase() !== connectedAddress.toLowerCase()) return null;
  return <AgentCard agentId={agentId} />;
}

const AgentsPage: NextPage = () => {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "leaderboard" ? "leaderboard" : "my";
  const [showRegister, setShowRegister] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentSystemPrompt, setAgentSystemPrompt] = useState("");

  const { address } = useAccount();
  const { data: nextId, isLoading } = useAgentCount();
  const count = nextId ? Number(nextId) - 1 : 0;
  const ids = useMemo(() => Array.from({ length: count }, (_, i) => BigInt(i + 1)), [count]);

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "AgentIdentityRegistry",
  });

  // ── Leaderboard sorting ──
  // Collect scores from all agents, then render sorted
  const [scores, setScores] = useState<Map<bigint, bigint>>(new Map());
  const handleScoreData = useMemo(
    () => (agentId: bigint, score: bigint) => {
      setScores(prev => {
        if (prev.get(agentId) === score) return prev;
        const next = new Map(prev);
        next.set(agentId, score);
        return next;
      });
    },
    [],
  );

  const sortedIds = useMemo(() => {
    return [...ids].sort((a, b) => {
      const sa = scores.get(a) ?? 0n;
      const sb = scores.get(b) ?? 0n;
      if (sb > sa) return 1;
      if (sb < sa) return -1;
      return 0;
    });
  }, [ids, scores]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (isMining || !agentName.trim() || !agentSystemPrompt.trim()) return;

    // Store name + systemPrompt as JSON in the on-chain agentURI
    const metadata = JSON.stringify({
      name: agentName.trim(),
      systemPrompt: agentSystemPrompt.trim(),
    });

    await writeContractAsync({
      functionName: "register",
      args: [metadata],
    });

    setAgentName("");
    setAgentSystemPrompt("");
    setShowRegister(false);
  }

  return (
    <div className="flex flex-col grow px-6 py-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{tab === "leaderboard" ? "Leaderboard" : "My Agents"}</h1>
        {tab === "my" && address && (
          <button
            className="px-3 py-1.5 bg-[#A0153E] hover:bg-[#B91C4C] text-white text-xs font-semibold squircle-sm transition-colors"
            onClick={() => setShowRegister(!showRegister)}
          >
            {showRegister ? "Cancel" : "Register Agent"}
          </button>
        )}
      </div>

      {/* Register form */}
      {showRegister && tab === "my" && (
        <form onSubmit={handleRegister} className="bg-[#111111] border border-[#1A1A1A] squircle p-4 mb-4">
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5 block">Agent Name</Label>
              <Input
                type="text"
                placeholder="e.g. PokerBot 3000"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                maxLength={64}
                required
              />
            </div>
            <div>
              <Label className="mb-1.5 block">System Prompt</Label>
              <Textarea
                className="h-24 resize-none"
                placeholder="Describe your agent's poker strategy..."
                value={agentSystemPrompt}
                onChange={e => setAgentSystemPrompt(e.target.value)}
                required
              />
              <p className="text-[11px] text-neutral-600 mt-1">
                This prompt defines your agent&apos;s strategy and will be used every time it enters a tournament.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isMining || !agentName.trim() || !agentSystemPrompt.trim()}>
                {isMining ? "Registering..." : "Register"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="text-neutral-600 text-sm">Loading...</div>
        </div>
      )}

      {/* My Agents tab */}
      {!isLoading && tab === "my" && (
        <>
          {!address && (
            <div className="text-center py-16">
              <p className="text-neutral-600">Connect your wallet to see your agents.</p>
            </div>
          )}
          {address && count === 0 && (
            <div className="text-center py-16">
              <p className="text-neutral-600">No agents registered yet. Be the first!</p>
            </div>
          )}
          {address && (
            <div className="flex flex-col gap-3">
              {ids.map(id => (
                <MyAgentRow key={id.toString()} agentId={id} connectedAddress={address} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Leaderboard tab */}
      {!isLoading && tab === "leaderboard" && (
        <>
          {/* Hidden components to collect score data */}
          {ids.map(id => (
            <LeaderboardEntry key={id.toString()} agentId={id} onData={handleScoreData} />
          ))}

          {count === 0 && (
            <div className="text-center py-16">
              <p className="text-neutral-600">No agents registered yet.</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {sortedIds.map((id, i) => (
              <AgentCard key={id.toString()} agentId={id} rank={i + 1} showOwner />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AgentsPage;
