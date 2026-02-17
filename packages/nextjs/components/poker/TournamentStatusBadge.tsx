import { TournamentStatus } from "~~/hooks/useTournaments";

const STATUS_LABELS: Record<TournamentStatus, string> = {
  0: "Open",
  1: "Running",
  2: "Finished",
};

const STATUS_CLASSES: Record<TournamentStatus, string> = {
  0: "badge-success",
  1: "badge-warning",
  2: "badge-neutral",
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <span className={`badge ${STATUS_CLASSES[status]} badge-sm font-semibold`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
