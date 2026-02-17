import { TournamentStatus } from "~~/hooks/useTournaments";

const STATUS_LABELS: Record<TournamentStatus, string> = {
  0: "Open",
  1: "Running",
  2: "Finished",
};

const STATUS_CLASSES: Record<TournamentStatus, string> = {
  0: "text-green-500 bg-green-500/10",
  1: "text-[#A0153E] bg-[#A0153E]/10",
  2: "text-neutral-500 bg-neutral-500/10",
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <span className={`${STATUS_CLASSES[status]} px-2 py-0.5 rounded-md text-[11px] font-semibold`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
