export type Suit = "s" | "h" | "d" | "c";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
export type Card = string; // e.g. "As", "Td", "2h"

export type PlayerAction = "fold" | "check" | "call" | "raise";

export type Player = {
  seat: number;
  name: string;
  systemPrompt: string;
  wallet: string;
  stack: number;
  cards: Card[];
  folded: boolean;
  allIn: boolean;
  currentBet: number;
};

export type Street = "preflop" | "flop" | "turn" | "river";

export type GameState = {
  tournamentId: number;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  handNumber: number;
  dealerSeat: number;
  street: Street;
  blindLevel: number; // doubles every 3 hands: level 0=10/20, 1=20/40, 2=40/80, etc.
};

export type AgentData = {
  seat: number;
  wallet: string;
  name: string;
  systemPrompt: string;
};

export type GameEvent = {
  timestamp: number;
  type: string;
  data: string; // JSON stringified
};
