"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { EnterAgentModal } from "~~/components/poker/EnterAgentModal";
import { TournamentCard } from "~~/components/poker/TournamentCard";
import { Tournament, useTournament, useTournamentCount } from "~~/hooks/useTournaments";

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "0", label: "Open" },
  { key: "1", label: "Running" },
  { key: "2", label: "Finished" },
];

function TournamentRow({ id, filter, onEnter }: { id: bigint; filter: string; onEnter: (t: Tournament) => void }) {
  const { tournament } = useTournament(id);
  if (!tournament) return null;
  if (filter !== "all" && tournament.status !== Number(filter)) return null;

  return <TournamentCard tournament={tournament} onEnter={() => onEnter(tournament)} />;
}

const Tournaments: NextPage = () => {
  const [filter, setFilter] = useState("all");
  const [enterTarget, setEnterTarget] = useState<Tournament | null>(null);

  const { data: nextId, isLoading } = useTournamentCount();
  const count = nextId ? Number(nextId) - 1 : 0;
  const ids = Array.from({ length: count }, (_, i) => BigInt(count - i));

  return (
    <div className="flex flex-col grow px-6 py-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Tournaments</h1>
        <Link
          href="/tournaments/create"
          className="px-3 py-1.5 bg-[#A0153E] hover:bg-[#B91C4C] text-white text-xs font-semibold squircle-sm transition-colors"
        >
          Create
        </Link>
      </div>

      <div className="flex gap-1 mb-6">
        {FILTER_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            className={`px-3 py-1.5 text-xs font-medium squircle-sm transition-colors ${
              filter === key ? "bg-[#1A1A1A] text-white" : "text-neutral-600 hover:text-neutral-400"
            }`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-16">
          <div className="text-neutral-600 text-sm">Loading...</div>
        </div>
      )}

      {!isLoading && count === 0 && (
        <div className="text-center py-16">
          <p className="text-neutral-600 mb-4">No tournaments yet.</p>
          <Link
            href="/tournaments/create"
            className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-neutral-400 text-sm squircle-sm hover:border-[#3A3A3A] transition-colors"
          >
            Create the first one
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {ids.map(id => (
          <TournamentRow key={id.toString()} id={id} filter={filter} onEnter={setEnterTarget} />
        ))}
      </div>

      {enterTarget && (
        <EnterAgentModal tournamentId={enterTarget.id} buyIn={enterTarget.buyIn} onClose={() => setEnterTarget(null)} />
      )}
    </div>
  );
};

export default Tournaments;
