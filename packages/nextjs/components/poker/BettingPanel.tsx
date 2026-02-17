"use client";

import { useState } from "react";
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
  isOperator: boolean;
  onSettled?: () => void;
};

function oddsLabel(seatAmount: bigint, total: bigint): string {
  if (total === 0n || seatAmount === 0n) return "–";
  const pct = Number((seatAmount * 10000n) / total) / 100;
  return `${pct.toFixed(1)}%`;
}

function multiplierLabel(seatAmount: bigint, total: bigint): string {
  if (seatAmount === 0n || total === 0n) return "–";
  // payout multiplier ≈ totalPool / seatPool (simplified, ignoring fee)
  const mult = Number(total) / Number(seatAmount);
  return `${mult.toFixed(2)}x`;
}

export function BettingPanel({ tournamentId, tournamentStatus, agents, isOperator, onSettled }: Props) {
  const { isConnected } = useAccount();

  const { data: poolData, refetch: refetchPool } = useBettingPool(tournamentId);
  const { data: winningSeat, refetch: refetchWinner } = useWinningSeat(tournamentId);
  const { data: userBets, refetch: refetchUserBets } = useUserBets(tournamentId);
  const { data: hasClaimed, refetch: refetchClaimed } = useHasClaimed(tournamentId);

  const { writeContractAsync: writeBetting, isMining } = useScaffoldWriteContract({
    contractName: "TournamentBetting",
  });

  const [selectedSeat, setSelectedSeat] = useState<number>(0);
  const [betAmount, setBetAmount] = useState("0.01");
  const [settling, setSettling] = useState(false);
  const [settleSeat, setSettleSeat] = useState<number>(0);

  const totalPool = poolData?.[0] ?? 0n;
  const seatAmounts = poolData?.[1] ?? [];

  const winSeat = winningSeat !== undefined ? Number(winningSeat) : -1;
  const isSettled = winSeat >= 0;

  async function handlePlaceBet() {
    if (!betAmount) return;
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

  async function handleSettleBetting() {
    setSettling(true);
    try {
      await writeBetting({
        functionName: "settleBetting",
        args: [tournamentId, BigInt(settleSeat)],
      });
      refetchPool();
      refetchWinner();
      onSettled?.();
    } finally {
      setSettling(false);
    }
  }

  async function handleClaimWinnings() {
    await writeBetting({
      functionName: "claimWinnings",
      args: [tournamentId],
    });
    refetchClaimed();
  }

  // Determine if connected user has a winning bet to claim
  const userHasWinningBet =
    isSettled && winSeat >= 0 && userBets && userBets[winSeat] !== undefined && userBets[winSeat] > 0n;

  const canClaim = userHasWinningBet && !hasClaimed;

  return (
    <div className="flex flex-col gap-4">
      {/* Pool summary */}
      <div className="stats shadow bg-base-200 w-full">
        <div className="stat py-3">
          <div className="stat-title text-xs">Total Betting Pool</div>
          <div className="stat-value text-lg">{formatEther(totalPool)} MON</div>
        </div>
        <div className="stat py-3">
          <div className="stat-title text-xs">Status</div>
          <div className="stat-value text-lg">
            {isSettled ? `Settled — Seat ${winSeat} wins` : tournamentStatus === 0 ? "Bets open" : "Bets locked"}
          </div>
        </div>
      </div>

      {/* Per-seat odds table */}
      {agents.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-sm bg-base-200 rounded-xl">
            <thead>
              <tr>
                <th>Seat</th>
                <th>Agent</th>
                <th>Pool on this seat</th>
                <th>Implied odds</th>
                <th>Multiplier</th>
                {isConnected && <th>Your bet</th>}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => {
                const seatPool = seatAmounts[i] ?? 0n;
                const myBet = userBets?.[i] ?? 0n;
                const isWinner = isSettled && winSeat === i;
                return (
                  <tr
                    key={i}
                    className={
                      isWinner
                        ? "bg-success/20 font-bold"
                        : tournamentStatus === 0
                          ? "cursor-pointer hover:bg-base-300"
                          : ""
                    }
                    onClick={() => tournamentStatus === 0 && setSelectedSeat(i)}
                  >
                    <td>
                      <span
                        className={`badge badge-sm ${
                          selectedSeat === i && tournamentStatus === 0 ? "badge-primary" : "badge-ghost"
                        }`}
                      >
                        {i}
                      </span>
                    </td>
                    <td>
                      {agent.name}
                      {isWinner && <span className="ml-2">🏆</span>}
                    </td>
                    <td>{formatEther(seatPool)} MON</td>
                    <td>{oddsLabel(seatPool, totalPool)}</td>
                    <td>{multiplierLabel(seatPool, totalPool)}</td>
                    {isConnected && (
                      <td className={myBet > 0n ? "text-primary font-semibold" : "text-base-content/40"}>
                        {myBet > 0n ? `${formatEther(myBet)} MON` : "–"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Place bet form — only when tournament is Open */}
      {tournamentStatus === 0 && isConnected && (
        <div className="card bg-base-200 p-4 flex flex-col gap-3">
          <p className="font-semibold text-sm">Place a bet</p>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Agent seat</span>
              </label>
              <select
                className="select select-bordered select-sm w-40"
                value={selectedSeat}
                onChange={e => setSelectedSeat(Number(e.target.value))}
              >
                {agents.map((agent, i) => (
                  <option key={i} value={i}>
                    Seat {i} — {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Amount (MON)</span>
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="input input-bordered input-sm w-32"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handlePlaceBet}
              disabled={isMining || !betAmount || agents.length === 0}
            >
              {isMining ? <span className="loading loading-spinner loading-xs" /> : null}
              Bet
            </button>
          </div>
          <p className="text-xs text-base-content/50">Click a row to select a seat. Minimum bet: 0.001 MON.</p>
        </div>
      )}

      {/* Claim winnings — when settled and user has a winning bet */}
      {canClaim && (
        <div className="alert alert-success shadow flex-col items-start gap-2">
          <p className="font-bold">You picked the winner!</p>
          <p className="text-sm">
            Your bet on seat {winSeat}: {formatEther(userBets![winSeat])} MON
          </p>
          <button className="btn btn-success btn-sm" onClick={handleClaimWinnings} disabled={isMining}>
            {isMining ? <span className="loading loading-spinner loading-xs" /> : null}
            Claim Winnings
          </button>
        </div>
      )}

      {hasClaimed && <div className="alert alert-info text-sm">Winnings claimed.</div>}

      {/* Operator settle betting button — only after tournament finishes */}
      {isOperator && !isSettled && tournamentStatus === 2 && (
        <div className="card bg-base-200 p-4 flex flex-col gap-3">
          <p className="font-semibold text-sm">Settle Betting (Operator)</p>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Winning seat</span>
              </label>
              <select
                className="select select-bordered select-sm w-44"
                value={settleSeat}
                onChange={e => setSettleSeat(Number(e.target.value))}
              >
                {agents.map((agent, i) => (
                  <option key={i} value={i}>
                    Seat {i} — {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-warning btn-sm" onClick={handleSettleBetting} disabled={settling || isMining}>
              {settling ? <span className="loading loading-spinner loading-xs" /> : null}
              Settle Betting
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
