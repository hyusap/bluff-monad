"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { useScaffoldWriteContract, useScaffoldReadContract, useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";

export function CreateTournamentForm() {
  const router = useRouter();
  const [buyInEth, setBuyInEth] = useState("0");
  const [maxPlayers, setMaxPlayers] = useState(4);

  const { targetNetwork } = useTargetNetwork();
  const { chain: accountChain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const { data: deployedContract, isLoading: contractLoading } = useDeployedContractInfo({ contractName: "PokerVault" });
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
    return <div className="alert alert-warning text-sm">Connect your wallet to create a tournament.</div>;
  }

  if (wrongNetwork) {
    return (
      <div className="alert alert-warning text-sm flex-col items-start gap-2">
        <p>You&apos;re connected to the wrong network. Switch to <strong>{targetNetwork.name}</strong>.</p>
        <button className="btn btn-sm btn-warning" onClick={() => switchChain({ chainId: targetNetwork.id })}>
          Switch Network
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Buy-in (MON)</span>
          <span className="label-text-alt text-base-content/50">Set to 0 for a free tournament</span>
        </label>
        <input
          type="number"
          min="0"
          step="any"
          className="input input-bordered"
          placeholder="0"
          value={buyInEth}
          onChange={e => setBuyInEth(e.target.value)}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Max Players</span>
        </label>
        <input
          type="number"
          min="2"
          max="10"
          className="input input-bordered"
          value={maxPlayers}
          onChange={e => setMaxPlayers(Number(e.target.value))}
          required
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={isMining || contractLoading || !deployedContract}>
        {isMining ? <span className="loading loading-spinner loading-sm" /> : null}
        {contractLoading ? "Loading..." : "Create Tournament"}
      </button>
    </form>
  );
}
