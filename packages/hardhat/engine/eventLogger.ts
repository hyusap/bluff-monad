import { GameEvent } from "./types";

// In-memory storage of game events
const eventStore = new Map<number, GameEvent[]>();

export function initLogFile(tournamentId: number): void {
  eventStore.set(tournamentId, []);
}

export function logEvent(tournamentId: number, type: string, data: Record<string, unknown>): void {
  const events = eventStore.get(tournamentId) || [];
  const event: GameEvent = { timestamp: Date.now(), type, data: JSON.stringify(data) };
  events.push(event);
  eventStore.set(tournamentId, events);
  console.log(`[${type}] ${JSON.stringify(data)}`);
}

export function getEvents(tournamentId: number): GameEvent[] {
  return eventStore.get(tournamentId) || [];
}

export function getAllEvents(): Map<number, GameEvent[]> {
  return eventStore;
}

export function clearEvents(tournamentId?: number): void {
  if (tournamentId !== undefined) {
    eventStore.delete(tournamentId);
  } else {
    eventStore.clear();
  }
}
