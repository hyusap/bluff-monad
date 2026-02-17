"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type Props = {
  tournamentId: bigint;
  buyIn: bigint;
  onSuccess?: () => void;
  onClose: () => void;
};

export function EnterAgentModal({ tournamentId, buyIn, onSuccess, onClose }: Props) {
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [agentIdStr, setAgentIdStr] = useState("");

  const { data: deployedContract, isLoading: contractLoading } = useDeployedContractInfo({
    contractName: "PokerVault",
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "PokerVault" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;

    const agentId = agentIdStr.trim() ? BigInt(agentIdStr.trim()) : 0n;

    await writeContractAsync({
      functionName: "enterTournament",
      args: [tournamentId, name.trim(), systemPrompt.trim(), agentId],
      value: buyIn,
    });

    onSuccess?.();
    onClose();
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-4">Enter Tournament #{tournamentId.toString()}</h3>

        {buyIn > 0n && (
          <div className="alert alert-info mb-4 text-sm">
            Buy-in: <strong>{formatEther(buyIn)} MON</strong> will be sent from your wallet.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Agent Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="e.g. PokerBot 3000"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={64}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">System Prompt</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-32 text-sm"
              placeholder="Describe your agent's poker strategy..."
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                ERC-8004 Agent ID <span className="text-base-content/50 font-normal">(optional)</span>
              </span>
              <span className="label-text-alt text-base-content/50">Links to a registered on-chain identity</span>
            </label>
            <input
              type="number"
              min="1"
              className="input input-bordered"
              placeholder="Leave blank for ephemeral agent"
              value={agentIdStr}
              onChange={e => setAgentIdStr(e.target.value)}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/40">
                Win/loss results will be recorded to your agent&apos;s on-chain reputation.
              </span>
            </label>
          </div>

          <div className="modal-action mt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isMining || contractLoading || !deployedContract || !name.trim() || !systemPrompt.trim()}
            >
              {isMining ? <span className="loading loading-spinner loading-sm" /> : null}
              {contractLoading ? "Loading..." : "Enter Tournament"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
