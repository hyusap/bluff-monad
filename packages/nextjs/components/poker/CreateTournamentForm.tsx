"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";

export function CreateTournamentForm() {
  const router = useRouter();
  const [buyInEth, setBuyInEth] = useState("0");
  const [maxPlayers, setMaxPlayers] = useState(4);

  const { targetNetwork } = useTargetNetwork();
  const { chain: accountChain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const { data: deployedContract, isLoading: contractLoading } = useDeployedContractInfo({
    contractName: "PokerVault",
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "PokerVault" });

  const { data: nextId } = useScaffoldReadContract({
    contractName: "PokerVault",
    functionName: "nextTournamentId",
  });

  const wrongNetwork = isConnected && accountChain?.id !== targetNetwork.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let buyInWei: bigint;
    try {
      buyInWei = parseEther(buyInEth || "0");
    } catch {
      buyInWei = 0n;
    }

    await writeContractAsync({
      functionName: "createTournament",
      args: [buyInWei, maxPlayers],
    });

    if (nextId != null) {
      router.push(`/tournaments/${nextId.toString()}`);
    } else {
      router.push("/tournaments");
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-[#A0153E]/10 border border-[#A0153E]/20 squircle-sm px-4 py-3 text-sm text-[#A0153E]">
        Connect your wallet to create a tournament.
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 squircle-sm px-4 py-3 text-sm text-yellow-600">
        <p className="mb-2">
          Wrong network. Switch to <strong>{targetNetwork.name}</strong>.
        </p>
        <button
          className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold squircle-sm transition-colors"
          onClick={() => switchChain({ chainId: targetNetwork.id })}
        >
          Switch Network
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-neutral-400">Buy-in (MON)</label>
          <span className="text-[11px] text-neutral-600">0 for free</span>
        </div>
        <input
          type="number"
          min="0"
          step="any"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] squircle-sm px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#A0153E] transition-colors"
          placeholder="0"
          value={buyInEth}
          onChange={e => setBuyInEth(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-400 mb-1.5">Max Players</label>
        <input
          type="number"
          min="2"
          max="10"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] squircle-sm px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#A0153E] transition-colors"
          value={maxPlayers}
          onChange={e => setMaxPlayers(Number(e.target.value))}
          required
        />
      </div>

      <button
        type="submit"
        className="px-4 py-2.5 bg-[#A0153E] hover:bg-[#B91C4C] text-white text-sm font-semibold squircle-sm transition-colors disabled:opacity-40"
        disabled={isMining || contractLoading || !deployedContract}
      >
        {isMining ? "Creating..." : contractLoading ? "Loading..." : "Create Tournament"}
      </button>
    </form>
  );
}
