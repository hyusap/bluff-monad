import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export type GameEvent = {
  timestamp: number;
  type: string;
  data: string;
};

/**
 * GET /api/game/[id]
 *
 * Returns game events for a tournament. The off-chain AI runner writes events
 * to .context/game-logs/<id>.json. Falls back to an empty array if not found.
 *
 * Event shape: { timestamp: number (ms), type: string, data: string }
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let events: GameEvent[] = [];

  try {
    const filePath = join(process.cwd(), "..", "..", ".context", "game-logs", `${id}.json`);
    const raw = readFileSync(filePath, "utf-8");
    events = JSON.parse(raw);
  } catch {
    // File not found or invalid JSON — return empty events
  }

  return NextResponse.json({ events });
}
