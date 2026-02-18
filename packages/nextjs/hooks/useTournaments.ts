"use client";

import { useEffect } from "react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export type TournamentStatus = 0 | 1 | 2; // Open, Running, Finished

export type Tournament = {
  id: bigint;
  buyIn: bigint;
  prizePool: bigint;
  status: TournamentStatus;
  maxPlayers: number;
  agentCount: number;
};

/**
 * Returns basic info for a single tournament by ID.
 * The contract's `tournaments` mapping returns a tuple:
 * (buyIn, prizePool, status, maxPlayers, agents[])
 * Note: agents[] is not returned by the mapping directly — use getTournamentAgents for that.
 */
export function useTournament(id: bigint) {
  const { data, isLoading, refetch } = useScaffoldReadContract({
    contractName: "PokerVault",
    functionName: "tournaments",
    args: [id],
  });

  const { data: agents, refetch: refetchAgents } = useScaffoldReadContract({
    contractName: "PokerVault",
    functionName: "getTournamentAgents",
    args: [id],
  });

  let tournament: Tournament | undefined;
  if (data) {
    const tuple = data as unknown as [bigint, bigint, number, number, string];
    const [buyIn, prizePool, status, maxPlayers] = tuple;
    tournament = {
      id,
      buyIn,
      prizePool,
      status: status as TournamentStatus,
      maxPlayers,
      agentCount: agents ? agents.length : 0,
    };
  }

  const refetchAll = () => {
    refetch();
    refetchAgents();
  };

  // Aggressively poll every 2 seconds so all clients stay in sync without
  // waiting for the next block (which could be up to pollingInterval away).
  useEffect(() => {
    const interval = setInterval(refetchAll, 2000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { tournament, agents, isLoading, refetch: refetchAll };
}

/**
 * Returns the list of all tournaments by iterating from 1 to nextTournamentId.
 */
export function useTournamentCount() {
  return useScaffoldReadContract({
    contractName: "PokerVault",
    functionName: "nextTournamentId",
  });
}
