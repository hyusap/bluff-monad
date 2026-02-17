import { GameState, Player, PlayerAction, AgentData } from "./types";

const STARTING_STACK = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

export function initGameState(tournamentId: number, agents: AgentData[]): GameState {
  const players: Player[] = agents.map(a => ({
    seat: a.seat,
    name: a.name,
    systemPrompt: a.systemPrompt,
    wallet: a.wallet,
    stack: STARTING_STACK,
    cards: [],
    folded: false,
    allIn: false,
    currentBet: 0,
  }));
  return {
    tournamentId,
    players,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    handNumber: 0,
    dealerSeat: 0,
    street: "preflop",
  };
}

// Players still in the tournament (have chips) — ignores hand-level folded state
export function activePlayers(state: GameState): Player[] {
  return state.players.filter(p => p.stack > 0);
}

// Players still in the current hand (have chips AND haven't folded this hand)
export function handActivePlayers(state: GameState): Player[] {
  return state.players.filter(p => p.stack > 0 && !p.folded);
}

export function isTournamentOver(state: GameState): boolean {
  return activePlayers(state).length === 1;
}

export function startHand(state: GameState): GameState {
  const active = activePlayers(state);
  const dealerIdx = active.findIndex(p => p.seat === state.dealerSeat);
  const nextDealer = active[(dealerIdx + 1) % active.length];

  return {
    ...state,
    handNumber: state.handNumber + 1,
    dealerSeat: nextDealer.seat,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    street: "preflop",
    players: state.players.map(p => ({
      ...p,
      cards: [],
      folded: p.stack === 0, // only permanently fold busted players
      allIn: false,
      currentBet: 0,
    })),
  };
}

export function postBlinds(state: GameState): GameState {
  const active = activePlayers(state);
  const dealerIdx = active.findIndex(p => p.seat === state.dealerSeat);
  const sbIdx = (dealerIdx + 1) % active.length;
  const bbIdx = (dealerIdx + 2) % active.length;

  const sb = active[sbIdx];
  const bb = active[bbIdx];

  const sbAmount = Math.min(SMALL_BLIND, sb.stack);
  const bbAmount = Math.min(BIG_BLIND, bb.stack);

  return {
    ...state,
    pot: sbAmount + bbAmount,
    currentBet: bbAmount,
    players: state.players.map(p => {
      if (p.seat === sb.seat) return { ...p, stack: p.stack - sbAmount, currentBet: sbAmount, allIn: p.stack === sbAmount };
      if (p.seat === bb.seat) return { ...p, stack: p.stack - bbAmount, currentBet: bbAmount, allIn: p.stack === bbAmount };
      return p;
    }),
  };
}

export function getValidActions(player: Player, state: GameState): PlayerAction[] {
  const toCall = state.currentBet - player.currentBet;
  const actions: PlayerAction[] = [];

  if (toCall === 0) {
    actions.push("check");
  } else {
    actions.push("fold", "call");
  }

  if (player.stack > toCall) {
    actions.push("raise");
  }

  return actions;
}

export function applyAction(
  state: GameState,
  seat: number,
  action: PlayerAction,
  raiseAmount?: number,
): GameState {
  const player = state.players.find(p => p.seat === seat)!;
  const toCall = state.currentBet - player.currentBet;

  let updatedPlayer = { ...player };
  let potDelta = 0;

  if (action === "fold") {
    updatedPlayer.folded = true;
  } else if (action === "check") {
    // no change
  } else if (action === "call") {
    const callAmount = Math.min(toCall, player.stack);
    updatedPlayer.stack -= callAmount;
    updatedPlayer.currentBet += callAmount;
    updatedPlayer.allIn = updatedPlayer.stack === 0;
    potDelta = callAmount;
  } else if (action === "raise") {
    const minRaise = state.currentBet + BIG_BLIND;
    const target = Math.max(raiseAmount ?? minRaise, minRaise);
    const totalBet = Math.min(target, player.stack + player.currentBet);
    const chipsPut = totalBet - player.currentBet;
    updatedPlayer.stack -= chipsPut;
    updatedPlayer.currentBet = totalBet;
    updatedPlayer.allIn = updatedPlayer.stack === 0;
    potDelta = chipsPut;
    return {
      ...state,
      pot: state.pot + potDelta,
      currentBet: totalBet,
      players: state.players.map(p => p.seat === seat ? updatedPlayer : p),
    };
  }

  return {
    ...state,
    pot: state.pot + potDelta,
    players: state.players.map(p => p.seat === seat ? updatedPlayer : p),
  };
}

export function advanceStreet(state: GameState, newCommunityCards: string[]): GameState {
  const nextStreet = state.street === "preflop" ? "flop"
    : state.street === "flop" ? "turn"
    : "river";
  return {
    ...state,
    street: nextStreet,
    currentBet: 0,
    communityCards: [...state.communityCards, ...newCommunityCards],
    players: state.players.map(p => ({ ...p, currentBet: 0 })),
  };
}

export function awardPot(state: GameState, winnerSeat: number): GameState {
  return {
    ...state,
    pot: 0,
    players: state.players.map(p =>
      p.seat === winnerSeat ? { ...p, stack: p.stack + state.pot } : p,
    ),
  };
}

export { SMALL_BLIND, BIG_BLIND };
