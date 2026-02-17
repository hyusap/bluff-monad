import { NextRequest, NextResponse } from "next/server";

export type GameEvent = {
  timestamp: number;
  type: string;
  data: string;
};

const GAME_ENGINE_URL = process.env.GAME_ENGINE_URL || "http://localhost:3001";

/**
 * GET /api/game/[id]
 *
 * Proxies to the game engine's HTTP API to fetch events from in-memory storage.
 * Falls back to an empty array if the game engine is not running.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const response = await fetch(`${GAME_ENGINE_URL}/api/game/${id}`, {
      next: { revalidate: 0 }, // Don't cache, always fetch fresh
    });

    if (!response.ok) {
      return NextResponse.json({ events: [] });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Game engine not running or unreachable
    console.error(`Failed to fetch game events for tournament ${id}:`, error);
    return NextResponse.json({ events: [] });
  }
}
