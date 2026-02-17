"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Returns the next agent ID (total registered = nextAgentId - 1).
 */
export function useAgentCount() {
  return useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "nextAgentId",
  });
}

/**
 * Returns owner, URI, and existence status for a single agent.
 */
export function useAgent(agentId: bigint) {
  const { data: owner, isLoading: ownerLoading } = useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "ownerOf",
    args: [agentId],
  });

  const { data: uri, isLoading: uriLoading } = useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "tokenURI",
    args: [agentId],
  });

  const { data: agentExists, isLoading: existsLoading } = useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "exists",
    args: [agentId],
  });

  return {
    owner: owner as string | undefined,
    uri: uri as string | undefined,
    exists: agentExists as boolean | undefined,
    isLoading: ownerLoading || uriLoading || existsLoading,
  };
}

/**
 * Returns reputation summary (totalScore, feedbackCount) for an agent.
 */
export function useAgentReputation(agentId: bigint) {
  const { data, isLoading } = useScaffoldReadContract({
    contractName: "AgentReputationRegistry",
    functionName: "getSummary",
    args: [agentId],
  });

  let totalScore: bigint | undefined;
  let feedbackCount: bigint | undefined;
  if (data) {
    const tuple = data as unknown as [bigint, bigint];
    totalScore = tuple[0];
    feedbackCount = tuple[1];
  }

  return { totalScore, feedbackCount, isLoading };
}
