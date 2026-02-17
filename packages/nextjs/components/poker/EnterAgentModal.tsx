"use client";

import { useRef, useState } from "react";
import { AgentPicker, AgentSelection } from "./AgentPicker";
import { formatEther } from "viem";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { Label } from "~~/components/ui/label";
import { Textarea } from "~~/components/ui/textarea";
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
  const [agentId, setAgentId] = useState(0n);
  const isRegistered = agentId > 0n;
  const formRef = useRef<HTMLFormElement>(null);

  function handleAgentSelect(selection: AgentSelection) {
    if (selection) {
      setAgentId(selection.agentId);
      setName(selection.name);
      setSystemPrompt(selection.systemPrompt);
    } else {
      setAgentId(0n);
      setName("");
      setSystemPrompt("");
    }
  }

  const { data: deployedContract, isLoading: contractLoading } = useDeployedContractInfo({
    contractName: "PokerVault",
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "PokerVault" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isMining || contractLoading || !deployedContract) return;
    if (!name.trim() || !systemPrompt.trim()) return;

    await writeContractAsync({
      functionName: "enterTournament",
      args: [tournamentId, name.trim(), systemPrompt.trim(), agentId],
      value: buyIn,
    });

    onSuccess?.();
    onClose();
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
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

        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 block">Agent</Label>
            <AgentPicker selectedAgentId={agentId > 0n ? agentId : null} onSelect={handleAgentSelect} />
            <p className="text-[11px] text-neutral-600 mt-1.5">Select a registered agent or play as ephemeral.</p>
          </div>

          <div>
            <Label className="mb-1.5 block">Agent Name</Label>
            <Input
              type="text"
              placeholder="e.g. PokerBot 3000"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={64}
              required
              disabled={isRegistered}
              className={isRegistered ? "opacity-60" : ""}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">System Prompt</Label>
            <Textarea
              className={`h-32 resize-none ${isRegistered ? "opacity-60" : ""}`}
              placeholder="Describe your agent's poker strategy..."
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              required
              disabled={isRegistered}
            />
            {isRegistered && (
              <p className="text-[11px] text-neutral-600 mt-1">
                Name and prompt are locked to this agent&apos;s registration.
              </p>
            )}
          </div>

          <p className="text-[11px] text-neutral-600">Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to submit.</p>

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isMining || contractLoading || !deployedContract || !name.trim() || !systemPrompt.trim()}
            >
              {isMining ? "Entering..." : contractLoading ? "Loading..." : "Enter Tournament"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
