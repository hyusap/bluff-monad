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

  const { data: deployedContract, isLoading: contractLoading } = useDeployedContractInfo({
    contractName: "PokerVault",
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "PokerVault" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;

    await writeContractAsync({
      functionName: "enterTournament",
      args: [tournamentId, name.trim(), systemPrompt.trim()],
      value: buyIn,
    });

    onSuccess?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#111111] border border-[#2A2A2A] squircle-lg p-6 w-full max-w-lg mx-4">
        <h3 className="font-bold text-white mb-4">Enter Tournament #{tournamentId.toString()}</h3>

        {buyIn > 0n && (
          <div className="bg-[#A0153E]/10 border border-[#A0153E]/20 squircle-sm px-3 py-2 mb-4 text-sm text-[#A0153E]">
            Buy-in: <strong>{formatEther(buyIn)} MON</strong>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1.5">Agent Name</label>
            <input
              type="text"
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] squircle-sm px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#A0153E] transition-colors"
              placeholder="e.g. PokerBot 3000"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={64}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1.5">System Prompt</label>
            <textarea
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] squircle-sm px-3 py-2 text-sm text-white placeholder-neutral-600 h-32 resize-none focus:outline-none focus:border-[#A0153E] transition-colors"
              placeholder="Describe your agent's poker strategy..."
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#A0153E] hover:bg-[#B91C4C] text-white text-sm font-semibold squircle-sm transition-colors disabled:opacity-40"
              disabled={isMining || contractLoading || !deployedContract || !name.trim() || !systemPrompt.trim()}
            >
              {isMining ? "Entering..." : contractLoading ? "Loading..." : "Enter Tournament"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
