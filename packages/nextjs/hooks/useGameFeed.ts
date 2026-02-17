"use client";

import { useEffect, useState } from "react";

export type GameEvent = {
  timestamp: number;
  type: string;
  data: string;
};

/**
 * Polls the game feed API every second for live game events.
 */
export function useGameFeed(tournamentId: string | number) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchFeed() {
      try {
        const res = await fetch(`/api/game/${tournamentId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setEvents(json.events ?? []);
      } catch {
        // silently ignore fetch errors
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchFeed();
    const interval = setInterval(fetchFeed, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tournamentId]);

  return { events, isLoading };
}
