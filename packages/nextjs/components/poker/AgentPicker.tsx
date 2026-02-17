"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useAgentCount } from "~~/hooks/useAgents";

export type AgentSelection = {
  agentId: bigint;
  name: string;
  systemPrompt: string;
} | null;

type Props = {
  selectedAgentId: bigint | null;
  onSelect: (selection: AgentSelection) => void;
};

/** Reads owner for a single agentId. */
function useAgentOwner(agentId: bigint) {
  const { data } = useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "ownerOf",
    args: [agentId],
  });
  return data as string | undefined;
}

/** Reads tokenURI for a single agentId. */
function useAgentURI(agentId: bigint) {
  const { data } = useScaffoldReadContract({
    contractName: "AgentIdentityRegistry",
    functionName: "tokenURI",
    args: [agentId],
  });
  return data as string | undefined;
}

/** Parse agent metadata from URI JSON string. */
function parseAgentMetadata(uri: string | undefined): { name: string; systemPrompt: string } | null {
  if (!uri) return null;
  try {
    const parsed = JSON.parse(uri);
    if (parsed.name && parsed.systemPrompt) {
      return { name: parsed.name, systemPrompt: parsed.systemPrompt };
    }
  } catch {
    // not JSON
  }
  return null;
}

/** Individual option that only renders if owned by connected wallet. */
function AgentOption({
  agentId,
  connectedAddress,
  onMount,
}: {
  agentId: bigint;
  connectedAddress: string;
  onMount: (agentId: bigint, name: string, systemPrompt: string) => void;
}) {
  const owner = useAgentOwner(agentId);
  const uri = useAgentURI(agentId);
  const meta = parseAgentMetadata(uri);

  // Register metadata so parent can look it up on selection — must be before early return
  useMemo(() => {
    if (meta) onMount(agentId, meta.name, meta.systemPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, meta?.name, meta?.systemPrompt, onMount]);

  if (!owner || owner.toLowerCase() !== connectedAddress.toLowerCase()) return null;

  const label = meta?.name ?? `Agent #${agentId.toString()}`;
  return (
    <option value={agentId.toString()}>
      {label} (#{agentId.toString()})
    </option>
  );
}

export function AgentPicker({ selectedAgentId, onSelect }: Props) {
  const { address } = useAccount();
  const { data: nextId } = useAgentCount();
  const count = nextId ? Number(nextId) - 1 : 0;
  const ids = useMemo(() => Array.from({ length: count }, (_, i) => BigInt(i + 1)), [count]);

  // Store metadata for each owned agent so we can pass it back on selection
  const agentMeta = useMemo(() => new Map<string, { name: string; systemPrompt: string }>(), []);
  const handleMount = useMemo(
    () => (agentId: bigint, name: string, systemPrompt: string) => {
      agentMeta.set(agentId.toString(), { name, systemPrompt });
    },
    [agentMeta],
  );

  function handleChange(value: string) {
    if (value === "0") {
      onSelect(null);
      return;
    }
    const id = BigInt(value);
    const meta = agentMeta.get(value);
    onSelect({
      agentId: id,
      name: meta?.name ?? "",
      systemPrompt: meta?.systemPrompt ?? "",
    });
  }

  return (
    <select
      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] squircle-sm px-3 py-2 text-sm text-neutral-300 focus:outline-none focus:border-[#3A3A3A]"
      value={selectedAgentId ? selectedAgentId.toString() : "0"}
      onChange={e => handleChange(e.target.value)}
    >
      <option value="0">Ephemeral (no persistent agent)</option>
      {address &&
        ids.map(id => (
          <AgentOption key={id.toString()} agentId={id} connectedAddress={address} onMount={handleMount} />
        ))}
    </select>
  );
}
