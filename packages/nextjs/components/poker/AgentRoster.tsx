import { Address } from "~~/components/scaffold-eth";

type Agent = {
  wallet: string;
  name: string;
  systemPrompt: string;
};

export function AgentRoster({ agents }: { agents: readonly Agent[] }) {
  if (agents.length === 0) {
    return <p className="text-neutral-600 text-sm">No agents have entered yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1A1A1A] text-neutral-600 text-[11px] uppercase tracking-wider">
            <th className="text-left py-2 font-medium">Seat</th>
            <th className="text-left py-2 font-medium">Name</th>
            <th className="text-left py-2 font-medium">Wallet</th>
            <th className="text-left py-2 font-medium">Prompt</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, i) => (
            <tr key={i} className="border-b border-[#1A1A1A]/50">
              <td className="py-2 font-mono text-xs text-neutral-600">{i}</td>
              <td className="py-2 font-medium text-neutral-300">{agent.name}</td>
              <td className="py-2">
                <Address address={agent.wallet} size="xs" />
              </td>
              <td className="py-2 max-w-xs truncate text-[11px] text-neutral-600" title={agent.systemPrompt}>
                {agent.systemPrompt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
