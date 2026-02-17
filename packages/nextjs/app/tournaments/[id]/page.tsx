"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, PlayIcon } from "@heroicons/react/24/outline";
import { TournamentStatusBadge } from "~~/components/poker/TournamentStatusBadge";
import { PokerTable } from "~~/components/poker/PokerTable";
import { GameFeed } from "~~/components/poker/GameFeed";
import { EnterAgentModal } from "~~/components/poker/EnterAgentModal";
import { useTournament } from "~~/hooks/useTournaments";
import { useGameFeed } from "~~/hooks/useGameFeed";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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

  // Auto-start when full capacity is reached (creator or operator)
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

  // Extract current game state from events
  const latestCommunity = events.findLast(e => e.type === "community");
  const communityCards = latestCommunity ? (JSON.parse(latestCommunity.data).cards as string[]) : [];

  // Build player positions from agents
  const playerPositions =
    agents?.map((agent, i) => ({
      name: agent.name,
      stack: BigInt(1000), // TODO: Get actual stack from events
      seat: i,
      isActive: !isFinished,
      isFolded: false,
    })) || [];

  // Get current pot from latest event
  const latestPotEvent = [...events]
    .reverse()
    .find(e => {
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
        <span className="loading loading-spinner loading-lg text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/40 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-3 text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            All Tournaments
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                Tournament #{id}
              </h1>
              <TournamentStatusBadge status={tournament.status} />
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-gray-500 text-xs uppercase tracking-wider">Buy-in</div>
                <div className="text-amber-400 font-bold text-lg">
                  {tournament.buyIn === 0n ? "Free" : `${formatEther(tournament.buyIn)} MON`}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-xs uppercase tracking-wider">Prize Pool</div>
                <div className="text-green-400 font-bold text-lg">{formatEther(tournament.prizePool)} MON</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-xs uppercase tracking-wider">Players</div>
                <div className="text-blue-400 font-bold text-lg">
                  {tournament.agentCount} / {tournament.maxPlayers}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Winner Banner */}
      {isFinished && winnerEvent && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border-y-4 border-amber-300 py-4">
          <div className="container mx-auto px-6">
            <div className="text-center text-2xl font-bold text-black flex items-center justify-center gap-3">
              <span className="text-4xl">🏆</span>
              {(JSON.parse(winnerEvent.data) as { name: string }).name} WINS THE TOURNAMENT!
              <span className="text-4xl">🏆</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
          {/* Left Sidebar - Game Feed */}
          <div className="order-2 lg:order-1">
            {(isRunning || isFinished || events.length > 0) && <GameFeed events={events} isLoading={feedLoading} />}

            {/* Action buttons when no game running */}
            {!isRunning && !isFinished && (
              <div className="space-y-4">
                {canStartTournament && canStart && (
                  <button
                    className="btn btn-success w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-none text-white font-bold"
                    onClick={handleStart}
                    disabled={isMining || autoStarting}
                  >
                    {isMining || autoStarting ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <PlayIcon className="h-5 w-5" />
                    )}
                    Start Tournament
                  </button>
                )}

                {isOpen && !isFull && connectedAddress && (
                  <button
                    className="btn btn-primary w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-none text-white font-bold"
                    onClick={() => setShowEnterModal(true)}
                  >
                    Enter with your agent
                  </button>
                )}

                {isOpen && isFull && !canStartTournament && (
                  <div className="alert alert-info bg-blue-900/30 border-blue-500/30 text-blue-300">
                    Tournament full — waiting for creator to start
                  </div>
                )}

                {/* Agent List */}
                <div className="bg-black/60 backdrop-blur-md rounded-xl border-2 border-gray-800 p-4">
                  <h3 className="text-lg font-bold text-amber-400 mb-3">Agents</h3>
                  <div className="space-y-2">
                    {agents && agents.length > 0 ? (
                      agents.map((agent, i) => (
                        <div key={i} className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-xs font-bold">
                              {agent.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-sm">{agent.name}</div>
                              <div className="text-xs text-gray-500">Seat {i}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mt-2 line-clamp-2" title={agent.systemPrompt}>
                            {agent.systemPrompt}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-sm text-center py-4">No agents yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - Poker Table */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <PokerTable
              players={playerPositions}
              communityCards={communityCards}
              pot={currentPot}
              maxPlayers={tournament.maxPlayers}
            />
          </div>
        </div>
      </div>

      {/* Enter Modal */}
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
