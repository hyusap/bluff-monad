"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useBettingPool, useHasClaimed, useUserBets, useWinningSeat } from "~~/hooks/useBetting";

type Agent = {
  wallet: string;
  name: string;
  systemPrompt: string;
  agentId: bigint;
};

type Props = {
  tournamentId: bigint;
  tournamentStatus: number; // 0=Open, 1=Running, 2=Finished
  agents: readonly Agent[];
};

function multiplierLabel(seatAmount: bigint, total: bigint): string {
  if (seatAmount === 0n || total === 0n) return "—";
  const mult = Number(total) / Number(seatAmount);
  return `${mult.toFixed(1)}x`;
}

function poolPercent(seatAmount: bigint, total: bigint): number {
  if (total === 0n || seatAmount === 0n) return 0;
  return Number((seatAmount * 10000n) / total) / 100;
}

export function BettingPanel({ tournamentId, tournamentStatus, agents }: Props) {
  const { isConnected } = useAccount();

  const { data: poolData, refetch: refetchPool } = useBettingPool(tournamentId);
  const { data: winningSeat } = useWinningSeat(tournamentId);
  const { data: userBets, refetch: refetchUserBets } = useUserBets(tournamentId);
  const { data: hasClaimed, refetch: refetchClaimed } = useHasClaimed(tournamentId);

  const { writeContractAsync: writeBetting, isMining } = useScaffoldWriteContract({
    contractName: "TournamentBetting",
  });

  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("0.01");

  const totalPool = poolData?.[0] ?? 0n;
  const seatAmounts = poolData?.[1] ?? [];

  const winSeat = winningSeat !== undefined ? Number(winningSeat) : -1;
  const isSettled = winSeat >= 0;
  const betsOpen = tournamentStatus === 0;

  async function handlePlaceBet() {
    if (!betAmount || selectedSeat === null) return;
    let value: bigint;
    try {
      value = parseEther(betAmount);
    } catch {
      return;
    }
    await writeBetting({
      functionName: "placeBet",
      args: [tournamentId, BigInt(selectedSeat)],
      value,
    });
    refetchPool();
    refetchUserBets();
  }

  // Auto-claim winnings
  const userHasWinningBet =
    isSettled && winSeat >= 0 && userBets && userBets[winSeat] !== undefined && userBets[winSeat] > 0n;
  const canClaim = userHasWinningBet && !hasClaimed;

  const autoClaimAttempted = useRef(false);
  useEffect(() => {
    if (!canClaim || autoClaimAttempted.current || isMining) return;
    autoClaimAttempted.current = true;

    writeBetting({ functionName: "claimWinnings", args: [tournamentId] })
      .then(() => {
        const winnings = formatEther(userBets![winSeat]);
        toast.success("Winnings claimed!", {
          description: `Your ${winnings} MON bet has been paid out.`,
        });
        refetchClaimed();
      })
      .catch(() => {
        autoClaimAttempted.current = false;
      });
  }, [canClaim]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find the highest pool share for scaling bars
  const maxPool = seatAmounts.length > 0 ? seatAmounts.reduce((a: bigint, b: bigint) => (a > b ? a : b), 0n) : 0n;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-neutral-500 text-xs font-medium uppercase tracking-wider">Pool</span>
          <span className="text-white font-semibold text-sm">{formatEther(totalPool)} MON</span>
        </div>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            isSettled
              ? "bg-emerald-500/15 text-emerald-400"
              : betsOpen
                ? "bg-blue-500/15 text-blue-400"
                : "bg-neutral-800 text-neutral-500"
          }`}
        >
          {isSettled ? "Settled" : betsOpen ? "Open" : "Locked"}
        </span>
      </div>

      {/* Agent cards */}
      {agents.length > 0 && (
        <div className="space-y-2">
          {agents.map((agent, i) => {
            const seatPool = seatAmounts[i] ?? 0n;
            const myBet = userBets?.[i] ?? 0n;
            const isWinner = isSettled && winSeat === i;
            const isSelected = selectedSeat === i && betsOpen;
            const pct = poolPercent(seatPool, totalPool);
            const barWidth = maxPool > 0n ? Number((seatPool * 100n) / maxPool) : 0;

            return (
              <button
                key={i}
                type="button"
                onClick={() => betsOpen && setSelectedSeat(i)}
                disabled={!betsOpen}
                className={`
                  w-full text-left relative overflow-hidden rounded-lg p-3 transition-all duration-150
                  ${
                    isWinner
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : isSelected
                        ? "bg-[#1A1A1A] border border-neutral-600"
                        : "bg-[#111111] border border-[#1A1A1A] hover:border-[#2A2A2A]"
                  }
                  ${betsOpen ? "cursor-pointer" : "cursor-default"}
                `}
              >
                {/* Pool share background bar */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isWinner ? "bg-emerald-500/8" : "bg-white/[0.02]"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />

                <div className="relative flex items-center justify-between gap-3">
                  {/* Left: agent info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isWinner
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isSelected
                            ? "bg-neutral-700 text-white border border-neutral-500"
                            : "bg-[#1A1A1A] text-neutral-500 border border-[#2A2A2A]"
                      }`}
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-200 truncate">
                        {agent.name}
                        {isWinner && <span className="ml-1.5 text-emerald-400 text-xs">Winner</span>}
                      </div>
                      {pct > 0 && <div className="text-[11px] text-neutral-600">{pct.toFixed(0)}% of pool</div>}
                    </div>
                  </div>

                  {/* Right: multiplier + your bet */}
                  <div className="flex items-center gap-3 shrink-0">
                    {myBet > 0n && isConnected && (
                      <div className="text-[11px] text-blue-400 font-medium">{formatEther(myBet)} MON</div>
                    )}
                    <div
                      className={`text-sm font-semibold tabular-nums ${
                        isWinner ? "text-emerald-400" : seatPool > 0n ? "text-neutral-300" : "text-neutral-700"
                      }`}
                    >
                      {multiplierLabel(seatPool, totalPool)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Bet form */}
      {betsOpen && isConnected && (
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type="number"
              min="0.001"
              step="0.001"
              placeholder="0.01"
              className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
              value={betAmount}
              onChange={e => setBetAmount(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-600 pointer-events-none">
              MON
            </span>
          </div>
          <button
            className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            onClick={handlePlaceBet}
            disabled={isMining || !betAmount || selectedSeat === null || agents.length === 0}
          >
            {isMining ? (
              <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : selectedSeat !== null ? (
              `Bet on ${agents[selectedSeat]?.name ?? "Agent"}`
            ) : (
              "Select an agent"
            )}
          </button>
        </div>
      )}

      {/* Status messages */}
      {canClaim && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 py-2">
          <span className="inline-block w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          Claiming your winnings…
        </div>
      )}

      {hasClaimed && <div className="text-sm text-emerald-400/70 py-1">Winnings claimed.</div>}

      {!isSettled && tournamentStatus === 2 && totalPool > 0n && (
        <div className="flex items-center gap-2 text-sm text-neutral-500 py-2">
          <span className="inline-block w-3 h-3 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin" />
          Settling bets…
        </div>
      )}
    </div>
  );
}
