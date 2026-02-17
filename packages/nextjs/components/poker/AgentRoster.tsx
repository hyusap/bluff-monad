import { Address } from "~~/components/scaffold-eth";

type Agent = {
  wallet: string;
  name: string;
  systemPrompt: string;
  agentId?: bigint;
};

export function AgentRoster({ agents }: { agents: readonly Agent[] }) {
  if (agents.length === 0) {
    return <p className="text-base-content/50 text-sm">No agents have entered yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Seat</th>
            <th>Name</th>
            <th>ERC-8004 ID</th>
            <th>Wallet</th>
            <th>System Prompt</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, i) => (
            <tr key={i}>
              <td className="font-mono text-xs">{i}</td>
              <td className="font-semibold">{agent.name}</td>
              <td>
                {agent.agentId && agent.agentId > 0n ? (
                  <span className="badge badge-accent badge-sm font-mono">#{agent.agentId.toString()}</span>
                ) : (
                  <span className="text-base-content/30 text-xs">–</span>
                )}
              </td>
              <td>
                <Address address={agent.wallet} size="xs" />
              </td>
              <td className="max-w-xs truncate text-xs text-base-content/60" title={agent.systemPrompt}>
                {agent.systemPrompt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
