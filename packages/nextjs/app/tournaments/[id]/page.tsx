"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { BettingPanel } from "~~/components/poker/BettingPanel";
import { EnterAgentModal } from "~~/components/poker/EnterAgentModal";
import { GameFeed } from "~~/components/poker/GameFeed";
import { PokerTable } from "~~/components/poker/PokerTable";
import { TournamentStatusBadge } from "~~/components/poker/TournamentStatusBadge";
import { ScrollArea } from "~~/components/ui/scroll-area";
import {
  useScaffoldReadContract,
  useScaffoldWatchContractEvent,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { useGameFeed } from "~~/hooks/useGameFeed";
import { useTournament } from "~~/hooks/useTournaments";

function toChipNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export default function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tournamentId = BigInt(id);

  const { tournament, agents, refetch } = useTournament(tournamentId);
  const { events, isLoading: feedLoading } = useGameFeed(id);
  const { address: connectedAddress } = useAccount();
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [autoStarting, setAutoStarting] = useState(false);
  const notifiedEventCountRef = useRef<number | null>(null);

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

  // Watch for tournament settlement (agent prize payout)
  useScaffoldWatchContractEvent({
    contractName: "PokerVault",
    eventName: "TournamentSettled",
    onLogs: logs => {
      for (const log of logs) {
        const args = (log as any).args;
        if (args?.tournamentId?.toString() !== id) continue;
        const payout = args.payout ? formatEther(args.payout) : "0";
        toast.success("Tournament settled", {
          description: `Prize of ${payout} MON paid to winner (seat ${args.winningSeat?.toString()})`,
        });
        refetch();
      }
    },
  });

  // Watch for betting settlement (spectator payouts ready)
  useScaffoldWatchContractEvent({
    contractName: "TournamentBetting",
    eventName: "BettingSettled",
    onLogs: logs => {
      for (const log of logs) {
        const args = (log as any).args;
        if (args?.tournamentId?.toString() !== id) continue;
        const pool = args.totalPool ? formatEther(args.totalPool) : "0";
        toast.success("Spectator betting settled", {
          description: `Betting pool: ${pool} MON. Winners can now claim!`,
        });
      }
    },
  });

  useEffect(() => {
    if (!canStartTournament || !isFull || !isOpen || autoStarting) return;
    setAutoStarting(true);
    writeContractAsync({ functionName: "startTournament", args: [tournamentId] })
      .then(() => refetch())
      .catch(() => {})
      .finally(() => setAutoStarting(false));
  }, [isFull, isOpen, canStartTournament]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (events.length === 0) return;
    if (notifiedEventCountRef.current === null) {
      notifiedEventCountRef.current = events.length;
      return;
    }

    const lastCount = notifiedEventCountRef.current;
    if (events.length <= lastCount) {
      notifiedEventCountRef.current = events.length;
      return;
    }

    const newEvents = events.slice(lastCount);
    notifiedEventCountRef.current = events.length;

    for (const event of newEvents) {
      try {
        const parsed = JSON.parse(event.data) as Record<string, unknown>;
        if (event.type === "hand_start") {
          const hand = toChipNumber(parsed.hand);
          const blinds = (parsed.blinds as { small?: unknown; big?: unknown } | undefined) ?? {};
          const smallBlind = toChipNumber(blinds.small);
          const bigBlind = toChipNumber(blinds.big);
          toast(`Hand #${hand} started`, { description: `Blinds ${smallBlind}/${bigBlind}` });
        } else if (event.type === "blinds_up") {
          const small = toChipNumber(parsed.small);
          const big = toChipNumber(parsed.big);
          toast("Blinds increased", { description: `${small}/${big}` });
        } else if (event.type === "winner") {
          toast.success(`${String(parsed.name ?? "Winner")} wins the tournament`);
        }
      } catch {
        // Ignore malformed payloads
      }
    }
  }, [events]);

  async function handleStart() {
    await writeContractAsync({ functionName: "startTournament", args: [tournamentId] });
    refetch();
  }

  const winnerEvent = events.findLast(e => e.type === "winner");

  const lastHandStartIndex = (() => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].type === "hand_start") return i;
    }
    return -1;
  })();
  const previousHandEndIndex =
    lastHandStartIndex > 0
      ? (() => {
          for (let i = lastHandStartIndex - 1; i >= 0; i--) {
            if (events[i].type === "hand_end") return i;
          }
          return -1;
        })()
      : -1;
  const currentHandEvents = events.slice(lastHandStartIndex >= 0 ? previousHandEndIndex + 1 : 0);

  const communityCards = currentHandEvents.flatMap(event => {
    if (event.type !== "community") return [];
    try {
      const parsed = JSON.parse(event.data) as { cards?: string[] };
      return Array.isArray(parsed.cards) ? parsed.cards : [];
    } catch {
      return [];
    }
  });

  const dealtCardsBySeat = new Map<number, string[]>();
  const foldedSeatsThisHand = new Set<number>();
  const eliminatedSeats = new Set<number>();
  const stacksBySeat = new Map<number, number>();
  let lastSeenPot = 0;

  for (let i = 0; i < (agents?.length ?? 0); i++) {
    stacksBySeat.set(i, 1000);
  }

  for (const event of events) {
    try {
      const parsed = JSON.parse(event.data) as Record<string, unknown>;

      if (event.type === "game_start") {
        const players = (parsed.players as Array<{ seat?: unknown; stack?: unknown }> | undefined) ?? [];
        for (const player of players) {
          const seat = toChipNumber(player.seat);
          stacksBySeat.set(seat, toChipNumber(player.stack));
        }
      }

      if (event.type === "hand_start") {
        const stacks = (parsed.stacks as Array<{ seat?: unknown; stack?: unknown }> | undefined) ?? [];
        for (const item of stacks) {
          const seat = toChipNumber(item.seat);
          stacksBySeat.set(seat, toChipNumber(item.stack));
        }
        lastSeenPot = toChipNumber(parsed.pot);
      }

      if (event.type === "action") {
        const seat = toChipNumber(parsed.seat);
        const actionPot = toChipNumber(parsed.pot);
        const contribution = Math.max(0, actionPot - lastSeenPot);
        if (contribution > 0 && stacksBySeat.has(seat)) {
          stacksBySeat.set(seat, Math.max(0, (stacksBySeat.get(seat) ?? 0) - contribution));
        }
        lastSeenPot = actionPot;
      }

      if (event.type === "hand_end") {
        const winnerSeat = toChipNumber(parsed.winner);
        const potWon = toChipNumber(parsed.pot);
        if (stacksBySeat.has(winnerSeat)) {
          stacksBySeat.set(winnerSeat, (stacksBySeat.get(winnerSeat) ?? 0) + potWon);
        }
        lastSeenPot = 0;
      }

      if (event.type === "eliminated") {
        const seat = toChipNumber(parsed.seat);
        eliminatedSeats.add(seat);
        stacksBySeat.set(seat, 0);
      }

      if (event.type === "winner") {
        const seat = toChipNumber(parsed.seat);
        const totalPot = toChipNumber(parsed.totalPot);
        if (totalPot > 0) stacksBySeat.set(seat, totalPot);
      }

      if (parsed.pot !== undefined && event.type !== "action" && event.type !== "hand_end") {
        lastSeenPot = toChipNumber(parsed.pot);
      }
    } catch {
      // Ignore malformed payloads
    }
  }

  for (const event of currentHandEvents) {
    if (event.type === "action") {
      try {
        const parsed = JSON.parse(event.data) as { seat?: unknown; action?: unknown };
        if (String(parsed.action) === "fold") {
          foldedSeatsThisHand.add(toChipNumber(parsed.seat));
        }
      } catch {
        // Ignore malformed payloads
      }
      continue;
    }

    if (event.type !== "deal") continue;
    try {
      const parsed = JSON.parse(event.data) as { seat?: number; cards?: string[] };
      if (typeof parsed.seat === "number" && Array.isArray(parsed.cards)) {
        dealtCardsBySeat.set(parsed.seat, parsed.cards);
      }
    } catch {
      // Ignore malformed log payloads
    }
  }

  const playerPositions =
    agents?.map((agent, i) => ({
      name: agent.name,
      stack: stacksBySeat.get(i) ?? 1000,
      seat: i,
      cards: dealtCardsBySeat.get(i),
      isActive: !isFinished && !eliminatedSeats.has(i),
      isFolded: eliminatedSeats.has(i) || foldedSeatsThisHand.has(i),
    })) || [];

  const latestPotEvent = [...events].reverse().find(e => {
    try {
      const parsed = JSON.parse(e.data);
      return parsed.pot !== undefined;
    } catch {
      return false;
    }
  });
  const currentPot = latestPotEvent ? toChipNumber(JSON.parse(latestPotEvent.data).pot) : 0;

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-neutral-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0A0A0A] text-white flex flex-col overflow-hidden">
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
      <div className="flex-1 min-h-0">
        <div className="flex flex-col lg:flex-row h-full w-full max-w-[1400px] mx-auto">
          {/* Left - Sidebar */}
          <aside className="w-full lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#1A1A1A] min-h-0 h-[42vh] lg:h-full">
            <ScrollArea className="h-full">
              {isRunning || isFinished || events.length > 0 ? (
                <GameFeed events={events} isLoading={feedLoading} />
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
            </ScrollArea>
          </aside>

          {/* Right - Table + Betting */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-center">
                <PokerTable
                  players={playerPositions}
                  communityCards={communityCards}
                  pot={currentPot}
                  maxPlayers={tournament.maxPlayers}
                />
              </div>

              <div className="bg-black/60 backdrop-blur-md rounded-xl border-2 border-gray-800 p-6">
                <h2 className="text-xl font-bold text-amber-400 mb-4">🎲 Spectator Betting</h2>
                <BettingPanel
                  tournamentId={tournamentId}
                  tournamentStatus={tournament.status}
                  agents={(agents ?? []) as any}
                />
              </div>
            </div>
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
