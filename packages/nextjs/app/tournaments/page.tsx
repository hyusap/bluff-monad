"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { TournamentCard } from "~~/components/poker/TournamentCard";
import { EnterAgentModal } from "~~/components/poker/EnterAgentModal";
import { useTournament, useTournamentCount, Tournament } from "~~/hooks/useTournaments";

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "0", label: "Open" },
  { key: "1", label: "Running" },
  { key: "2", label: "Finished" },
];

function TournamentRow({
  id,
  filter,
  onEnter,
}: {
  id: bigint;
  filter: string;
  onEnter: (t: Tournament) => void;
}) {
  const { tournament } = useTournament(id);
  if (!tournament) return null;
  if (filter !== "all" && tournament.status !== Number(filter)) return null;

  return (
    <TournamentCard
      tournament={tournament}
      onEnter={() => onEnter(tournament)}
    />
  );
}

const Tournaments: NextPage = () => {
  const [filter, setFilter] = useState("all");
  const [enterTarget, setEnterTarget] = useState<Tournament | null>(null);

  const { data: nextId, isLoading } = useTournamentCount();
  const count = nextId ? Number(nextId) - 1 : 0;
  const ids = Array.from({ length: count }, (_, i) => BigInt(count - i)); // newest first

  return (
    <div className="flex flex-col grow px-6 py-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Tournaments</h1>
        <Link href="/tournaments/create" className="btn btn-primary btn-sm gap-2">
          <PlusCircleIcon className="h-4 w-4" />
          Create
        </Link>
      </div>

      <div className="tabs tabs-boxed mb-6 w-fit">
        {FILTER_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            className={`tab ${filter === key ? "tab-active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <div className="loading loading-spinner mx-auto mt-16" />}

      {!isLoading && count === 0 && (
        <div className="text-center text-base-content/50 mt-16">
          <p className="text-lg mb-4">No tournaments yet.</p>
          <Link href="/tournaments/create" className="btn btn-outline">
            Create the first one
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {ids.map(id => (
          <TournamentRow key={id.toString()} id={id} filter={filter} onEnter={setEnterTarget} />
        ))}
      </div>

      {enterTarget && (
        <EnterAgentModal
          tournamentId={enterTarget.id}
          buyIn={enterTarget.buyIn}
          onClose={() => setEnterTarget(null)}
        />
      )}
    </div>
  );
};

export default Tournaments;
