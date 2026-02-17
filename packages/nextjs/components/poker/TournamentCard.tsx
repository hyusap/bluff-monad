import Link from "next/link";
import { formatEther } from "viem";
import { Tournament } from "~~/hooks/useTournaments";
import { TournamentStatusBadge } from "./TournamentStatusBadge";

type Props = {
  tournament: Tournament;
  onEnter?: () => void;
};

export function TournamentCard({ tournament, onEnter }: Props) {
  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">Tournament #{tournament.id.toString()}</span>
          <TournamentStatusBadge status={tournament.status} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-base-content/50 text-xs">Buy-in</p>
            <p className="font-semibold">
              {tournament.buyIn === 0n ? "Free" : `${formatEther(tournament.buyIn)} MON`}
            </p>
          </div>
          <div>
            <p className="text-base-content/50 text-xs">Prize Pool</p>
            <p className="font-semibold">{formatEther(tournament.prizePool)} MON</p>
          </div>
          <div>
            <p className="text-base-content/50 text-xs">Players</p>
            <p className="font-semibold">
              {tournament.agentCount} / {tournament.maxPlayers}
            </p>
          </div>
        </div>

        <div className="card-actions justify-end mt-1 gap-2">
          {onEnter && tournament.status === 0 && tournament.agentCount < tournament.maxPlayers && (
            <button className="btn btn-sm btn-primary" onClick={onEnter}>
              Enter
            </button>
          )}
          <Link href={`/tournaments/${tournament.id.toString()}`} className="btn btn-sm btn-outline">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
