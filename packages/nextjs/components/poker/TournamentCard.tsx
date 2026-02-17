import Link from "next/link";
import { TournamentStatusBadge } from "./TournamentStatusBadge";
import { formatEther } from "viem";
import { Tournament } from "~~/hooks/useTournaments";

type Props = {
  tournament: Tournament;
  onEnter?: () => void;
};

export function TournamentCard({ tournament, onEnter }: Props) {
  return (
    <div className="bg-[#111111] border border-[#1A1A1A] squircle p-4 hover:border-[#2A2A2A] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-white">Tournament #{tournament.id.toString()}</span>
        <TournamentStatusBadge status={tournament.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <div>
          <p className="text-neutral-600 text-[11px]">Buy-in</p>
          <p className="font-medium text-neutral-300">
            {tournament.buyIn === 0n ? "Free" : `${formatEther(tournament.buyIn)} MON`}
          </p>
        </div>
        <div>
          <p className="text-neutral-600 text-[11px]">Prize</p>
          <p className="font-medium text-neutral-300">{formatEther(tournament.prizePool)} MON</p>
        </div>
        <div>
          <p className="text-neutral-600 text-[11px]">Players</p>
          <p className="font-medium text-neutral-300">
            {tournament.agentCount}/{tournament.maxPlayers}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onEnter && tournament.status === 0 && tournament.agentCount < tournament.maxPlayers && (
          <button
            className="px-3 py-1.5 bg-[#A0153E] hover:bg-[#B91C4C] text-white text-xs font-semibold squircle-sm transition-colors"
            onClick={onEnter}
          >
            Enter
          </button>
        )}
        <Link
          href={`/tournaments/${tournament.id.toString()}`}
          className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#222222] text-neutral-400 text-xs font-semibold squircle-sm border border-[#2A2A2A] transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}
