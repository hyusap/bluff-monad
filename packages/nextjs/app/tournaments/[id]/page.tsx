"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, PlayIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { AgentRoster } from "~~/components/poker/AgentRoster";
import { BettingPanel } from "~~/components/poker/BettingPanel";
import { EnterAgentModal } from "~~/components/poker/EnterAgentModal";
import { GameFeed } from "~~/components/poker/GameFeed";
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

  if (!tournament) {
    return (
      <div className="flex items-center justify-center grow">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col grow px-6 py-8 max-w-3xl mx-auto w-full gap-6">
      {/* Back + Title */}
      <div>
        <Link href="/tournaments" className="btn btn-ghost btn-sm gap-2 mb-4 pl-0">
          <ArrowLeftIcon className="h-4 w-4" />
          All Tournaments
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Tournament #{id}</h1>
          <TournamentStatusBadge status={tournament.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="stats shadow w-full">
        <div className="stat">
          <div className="stat-title">Buy-in</div>
          <div className="stat-value text-xl">
            {tournament.buyIn === 0n ? "Free" : `${formatEther(tournament.buyIn)} MON`}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Prize Pool</div>
          <div className="stat-value text-xl">{formatEther(tournament.prizePool)} MON</div>
        </div>
        <div className="stat">
          <div className="stat-title">Players</div>
          <div className="stat-value text-xl">
            {tournament.agentCount} / {tournament.maxPlayers}
          </div>
        </div>
      </div>

      {/* Winner card */}
      {isFinished && winnerEvent && (
        <div className="alert alert-success shadow flex gap-3">
          <TrophyIcon className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-bold">Tournament Over!</p>
            <p className="text-sm">{(JSON.parse(winnerEvent.data) as { name: string }).name} wins!</p>
          </div>
        </div>
      )}

      {/* Creator/operator start button */}
      {canStartTournament && canStart && (
        <div className="flex items-center gap-3">
          <button className="btn btn-success gap-2" onClick={handleStart} disabled={isMining || autoStarting}>
            {isMining || autoStarting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            Start Tournament
          </button>
          {isFull && <span className="text-sm text-success font-semibold">Full — starting automatically…</span>}
        </div>
      )}

      {/* Player enter button */}
      {isOpen && !isFull && connectedAddress && (
        <button className="btn btn-primary w-fit" onClick={() => setShowEnterModal(true)}>
          Enter with your agent
        </button>
      )}
      {isOpen && isFull && !canStartTournament && (
        <div className="alert alert-info text-sm">Tournament is full — waiting for the creator to start.</div>
      )}

      {/* Agent Roster */}
      <div>
        <h2 className="text-xl font-bold mb-3">Agents</h2>
        {agents ? <AgentRoster agents={agents as any} /> : <span className="loading loading-spinner loading-sm" />}
      </div>

      {/* Betting Panel — visible for all tournament states */}
      <div>
        <h2 className="text-xl font-bold mb-3">Spectator Betting</h2>
        <BettingPanel
          tournamentId={tournamentId}
          tournamentStatus={tournament.status}
          agents={(agents ?? []) as any}
          isOperator={!!isOperator}
          onSettled={refetch}
        />
      </div>

      {/* Live Game Feed */}
      {(isRunning || isFinished || events.length > 0) && (
        <div>
          <h2 className="text-xl font-bold mb-3">{isRunning ? "Live Feed" : "Game Log"}</h2>
          <GameFeed events={events} isLoading={feedLoading} />
        </div>
      )}

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
