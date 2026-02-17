"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { EnterAgentModal } from "~~/components/poker/EnterAgentModal";
import { GameFeed } from "~~/components/poker/GameFeed";
import { PokerTable } from "~~/components/poker/PokerTable";
import { TournamentStatusBadge } from "~~/components/poker/TournamentStatusBadge";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useGameFeed } from "~~/hooks/useGameFeed";
import { useTournament } from "~~/hooks/useTournaments";

export default function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tournamentId = BigInt(id);

  const { tournament, agents, refetch } = useTournament(tournamentId);
  const { events, isLoading: feedLoading } = useGameFeed(id);
  const { address: connectedAddress } = useAccount();
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [autoStarting, setAutoStarting] = useState(false);

  const { data: operatorAddress } = useScaffoldReadContract({
    contractName: "PokerVault",
    functionName: "operator",
  });

  const { data: creatorAddress } = useScaffoldReadContract({
    contractName: "PokerVault",
    functionName: "getTournamentCreator",
    args: [tournamentId],
  });

  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "PokerVault" });

  const isOperator =
    connectedAddress && operatorAddress && connectedAddress.toLowerCase() === (operatorAddress as string).toLowerCase();
  const isCreator =
    connectedAddress && creatorAddress && connectedAddress.toLowerCase() === (creatorAddress as string).toLowerCase();
  const canStartTournament = isOperator || isCreator;

  const isOpen = tournament?.status === 0;
  const isRunning = tournament?.status === 1;
  const isFinished = tournament?.status === 2;
  const isFull = tournament ? tournament.agentCount >= tournament.maxPlayers : false;
  const hasEnoughPlayers = tournament ? tournament.agentCount >= 2 : false;
  const canStart = isOpen && hasEnoughPlayers;

  useEffect(() => {
    if (!canStartTournament || !isFull || !isOpen || autoStarting) return;
    setAutoStarting(true);
    writeContractAsync({ functionName: "startTournament", args: [tournamentId] })
      .then(() => refetch())
      .catch(() => {})
      .finally(() => setAutoStarting(false));
  }, [isFull, isOpen, canStartTournament]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    await writeContractAsync({ functionName: "startTournament", args: [tournamentId] });
    refetch();
  }

  const winnerEvent = events.findLast(e => e.type === "winner");

  const latestCommunity = events.findLast(e => e.type === "community");
  const communityCards = latestCommunity ? (JSON.parse(latestCommunity.data).cards as string[]) : [];

  const playerPositions =
    agents?.map((agent, i) => ({
      name: agent.name,
      stack: BigInt(1000),
      seat: i,
      isActive: !isFinished,
      isFolded: false,
    })) || [];

  const latestPotEvent = [...events].reverse().find(e => {
    try {
      const parsed = JSON.parse(e.data);
      return parsed.pot !== undefined;
    } catch {
      return false;
    }
  });
  const currentPot = latestPotEvent ? BigInt(JSON.parse(latestPotEvent.data).pot || 0) : BigInt(0);

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-neutral-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-400 transition-colors mb-3 text-sm"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Tournament #{id}</h1>
              <TournamentStatusBadge status={tournament.status} />
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-neutral-600 text-[11px]">Buy-in</div>
                <div className="text-neutral-300 font-medium">
                  {tournament.buyIn === 0n ? "Free" : `${formatEther(tournament.buyIn)} MON`}
                </div>
              </div>
              <div>
                <div className="text-neutral-600 text-[11px]">Prize</div>
                <div className="text-neutral-300 font-medium">{formatEther(tournament.prizePool)} MON</div>
              </div>
              <div>
                <div className="text-neutral-600 text-[11px]">Players</div>
                <div className="text-neutral-300 font-medium">
                  {tournament.agentCount}/{tournament.maxPlayers}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Winner Banner */}
      {isFinished && winnerEvent && (
        <div className="border-b border-[#A0153E]/30 bg-[#A0153E]/10 py-3">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <span className="text-[#A0153E] font-bold">
              {(JSON.parse(winnerEvent.data) as { name: string }).name} wins the tournament
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        <div className="flex w-full max-w-[1400px] mx-auto">
          {/* Left - Feed */}
          <div className="w-[320px] shrink-0 border-r border-[#1A1A1A] flex flex-col">
            {isRunning || isFinished || events.length > 0 ? (
              <div className="flex-1 min-h-0">
                <GameFeed events={events} isLoading={feedLoading} />
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {canStartTournament && canStart && (
                  <button
                    className="w-full py-2.5 bg-[#A0153E] hover:bg-[#B91C4C] text-white text-sm font-semibold squircle-sm transition-colors disabled:opacity-40"
                    onClick={handleStart}
                    disabled={isMining || autoStarting}
                  >
                    {isMining || autoStarting ? "Starting..." : "Start Tournament"}
                  </button>
                )}

                {isOpen && !isFull && connectedAddress && (
                  <button
                    className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] text-neutral-300 text-sm font-semibold squircle-sm transition-colors"
                    onClick={() => setShowEnterModal(true)}
                  >
                    Enter with your agent
                  </button>
                )}

                {isOpen && isFull && !canStartTournament && (
                  <div className="bg-[#111111] border border-[#1A1A1A] squircle-sm px-3 py-2 text-neutral-500 text-sm">
                    Tournament full -- waiting for creator to start
                  </div>
                )}

                {/* Agent List */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Agents</h3>
                  {agents && agents.length > 0 ? (
                    agents.map((agent, i) => (
                      <div key={i} className="bg-[#111111] squircle-sm p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[9px] font-bold text-neutral-500">
                            {agent.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-xs text-neutral-300">{agent.name}</span>
                        </div>
                        <div className="text-[11px] text-neutral-600 line-clamp-2 pl-8" title={agent.systemPrompt}>
                          {agent.systemPrompt}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-600 text-sm text-center py-4">No agents yet</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right - Poker Table */}
          <div className="flex-1 flex items-center justify-center p-8">
            <PokerTable
              players={playerPositions}
              communityCards={communityCards}
              pot={currentPot}
              maxPlayers={tournament.maxPlayers}
            />
          </div>
        </div>
      </div>

      {showEnterModal && (
        <EnterAgentModal
          tournamentId={tournamentId}
          buyIn={tournament.buyIn}
          onSuccess={refetch}
          onClose={() => setShowEnterModal(false)}
        />
      )}
    </div>
  );
}
