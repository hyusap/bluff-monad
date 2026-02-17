import * as fs from "fs";
import * as path from "path";
import { GameEvent } from "./types";

function logDir(): string {
  // process.cwd() is the hardhat package dir when run via `hardhat run`
  // .context/game-logs lives at the monorepo root (two levels up from packages/hardhat)
  return path.resolve(process.cwd(), "../../.context/game-logs");
}

function logPath(tournamentId: number): string {
  return path.join(logDir(), `${tournamentId}.json`);
}

export function initLogFile(tournamentId: number): void {
  fs.mkdirSync(logDir(), { recursive: true });
  fs.writeFileSync(logPath(tournamentId), "[]", "utf-8");
}

export function logEvent(tournamentId: number, type: string, data: Record<string, unknown>): void {
  const filePath = logPath(tournamentId);
  let events: GameEvent[] = [];
  try {
    events = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    events = [];
  }
  const event: GameEvent = { timestamp: Date.now(), type, data: JSON.stringify(data) };
  events.push(event);
  fs.writeFileSync(filePath, JSON.stringify(events, null, 2), "utf-8");
  console.log(`[${type}] ${JSON.stringify(data)}`);
}
