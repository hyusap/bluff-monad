"use client";

import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Returns the total betting pool and per-seat bet amounts for a tournament.
 */
export function useBettingPool(tournamentId: bigint) {
  return useScaffoldReadContract({
    contractName: "TournamentBetting",
    functionName: "getBettingPool",
    args: [tournamentId],
  });
}

/**
 * Returns the winning seat index (or -1 if not yet settled).
 */
export function useWinningSeat(tournamentId: bigint) {
  return useScaffoldReadContract({
    contractName: "TournamentBetting",
    functionName: "getWinningSeat",
    args: [tournamentId],
  });
}

/**
 * Returns the connected user's bet amounts on each seat for a tournament.
 */
export function useUserBets(tournamentId: bigint) {
  const { address } = useAccount();
  return useScaffoldReadContract({
    contractName: "TournamentBetting",
    functionName: "getUserBets",
    args: [tournamentId, address],
    query: { enabled: !!address },
  });
}

/**
 * Returns whether the connected user has already claimed winnings.
 */
export function useHasClaimed(tournamentId: bigint) {
  const { address } = useAccount();
  return useScaffoldReadContract({
    contractName: "TournamentBetting",
    functionName: "claimed",
    args: [tournamentId, address],
    query: { enabled: !!address },
  });
}
