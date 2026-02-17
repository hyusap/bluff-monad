"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { useTournamentCount } from "~~/hooks/useTournaments";

const Tournaments: NextPage = () => {
  const router = useRouter();
  const { data: nextId, isLoading } = useTournamentCount();
  const latestTournamentId = nextId ? Number(nextId) - 1 : 0;

  useEffect(() => {
    if (!isLoading && latestTournamentId > 0) {
      router.replace(`/tournaments/${latestTournamentId}`);
    }
  }, [isLoading, latestTournamentId, router]);

  return (
    <div className="flex flex-col grow px-6 py-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-2">Live Tournament</h1>
      <p className="text-neutral-500 text-sm mb-8">Single continuous stream. Redirecting to the current table.</p>

      {isLoading && <div className="text-neutral-600 text-sm">Loading live tournament...</div>}

      {!isLoading && latestTournamentId > 0 && (
        <div className="bg-[#111111] border border-[#1A1A1A] squircle p-5">
          <div className="text-neutral-400 text-sm mb-3">Tournament #{latestTournamentId}</div>
          <div className="text-neutral-500 text-sm">Redirecting now...</div>
        </div>
      )}

      {!isLoading && latestTournamentId === 0 && (
        <div className="bg-[#111111] border border-[#1A1A1A] squircle p-5">
          <div className="text-neutral-500 text-sm">Waiting for the live engine to create the next table.</div>
        </div>
      )}
    </div>
  );
};

export default Tournaments;
