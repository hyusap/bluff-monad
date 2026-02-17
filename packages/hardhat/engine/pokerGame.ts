import { AgentData, GameState } from "./types";
import { createDeck, shuffle, deal } from "./deck";
import { bestHand } from "./handEvaluator";
import { getAgentDecision } from "./claudeAgent";
import { logEvent, initLogFile } from "./eventLogger";
import {
  initGameState,
  startHand,
  postBlinds,
  getValidActions,
  applyAction,
  advanceStreet,
  awardPot,
  activePlayers,
  handActivePlayers,
  isTournamentOver,
  getBlinds,
} from "./gameState";

async function runBettingRound(state: GameState, startSeat: number): Promise<GameState> {
  // Only players still in this hand (chips + not folded)
  const canAct = handActivePlayers(state).filter(p => !p.allIn);
  if (canAct.length <= 1) return state;

  const startIdx = canAct.findIndex(p => p.seat >= startSeat);
  const ordered = startIdx >= 0 ? [...canAct.slice(startIdx), ...canAct.slice(0, startIdx)] : canAct;

  let queue = [...ordered];
  let lastRaiserSeat: number | null = null;
  let current = state;

  while (queue.length > 0) {
    const player = queue.shift()!;
    const livePlayer = current.players.find(p => p.seat === player.seat)!;

    if (livePlayer.folded || livePlayer.allIn) continue;

    // Only one player left in the hand — stop
    if (handActivePlayers(current).length === 1) break;

    const validActions = getValidActions(livePlayer, current);
    const { action, raiseAmount, reasoning, thinking } = await getAgentDecision(livePlayer, current, validActions);

    current = applyAction(current, livePlayer.seat, action, raiseAmount);

    logEvent(current.tournamentId, "action", {
      seat: livePlayer.seat,
      name: livePlayer.name,
      action,
      amount:
        action === "raise"
          ? raiseAmount
          : action === "call"
            ? Math.min(state.currentBet - livePlayer.currentBet, livePlayer.stack)
            : undefined,
      pot: current.pot,
      reasoning,
      thinking,
    });

    if (action === "raise") {
      lastRaiserSeat = livePlayer.seat;
      queue = handActivePlayers(current).filter(p => !p.allIn && p.seat !== livePlayer.seat);
    }

    if (lastRaiserSeat !== null && queue.length === 0) break;
  }

  return current;
}

async function runHand(state: GameState): Promise<GameState> {
  let current = startHand(state);
  const active = activePlayers(current);

  let deck = shuffle(createDeck());
  for (const player of active) {
    const { cards, remaining } = deal(deck, 2);
    deck = remaining;
    current = { ...current, players: current.players.map(p => (p.seat === player.seat ? { ...p, cards } : p)) };
    logEvent(current.tournamentId, "deal", { seat: player.seat, name: player.name, cards });
  }

  current = postBlinds(current);

  const { smallBlind, bigBlind } = getBlinds(current.blindLevel);
  logEvent(current.tournamentId, "hand_start", {
    hand: current.handNumber,
    dealer: current.dealerSeat,
    pot: current.pot,
    blinds: { small: smallBlind, big: bigBlind },
    stacks: activePlayers(current).map(p => ({ seat: p.seat, name: p.name, stack: p.stack })),
  });

  // Preflop — action starts left of big blind (UTG)
  const activeSeats = activePlayers(current).map(p => p.seat);
  const dealerIdx = activeSeats.indexOf(current.dealerSeat);
  const utg = activeSeats[(dealerIdx + 3) % activeSeats.length];
  current = await runBettingRound(current, utg);

  if (handActivePlayers(current).length === 1) {
    const winner = handActivePlayers(current)[0];
    const pot = current.pot;
    current = awardPot(current, winner.seat);
    logEvent(current.tournamentId, "hand_end", {
      winner: winner.seat,
      winnerName: winner.name,
      pot,
      reason: "last_standing",
    });
    return current;
  }

  // Flop
  const { cards: flop, remaining: deckAfterFlop } = deal(deck, 3);
  deck = deckAfterFlop;
  current = advanceStreet(current, flop);
  logEvent(current.tournamentId, "community", { street: "flop", cards: flop, pot: current.pot });
  current = await runBettingRound(current, activeSeats[(dealerIdx + 1) % activeSeats.length]);

  if (handActivePlayers(current).length === 1) {
    const winner = handActivePlayers(current)[0];
    const pot = current.pot;
    current = awardPot(current, winner.seat);
    logEvent(current.tournamentId, "hand_end", {
      winner: winner.seat,
      winnerName: winner.name,
      pot,
      reason: "last_standing",
    });
    return current;
  }

  // Turn
  const {
    cards: [turnCard],
    remaining: deckAfterTurn,
  } = deal(deck, 1);
  deck = deckAfterTurn;
  current = advanceStreet(current, [turnCard]);
  logEvent(current.tournamentId, "community", { street: "turn", cards: [turnCard], pot: current.pot });
  current = await runBettingRound(current, activeSeats[(dealerIdx + 1) % activeSeats.length]);

  if (handActivePlayers(current).length === 1) {
    const winner = handActivePlayers(current)[0];
    const pot = current.pot;
    current = awardPot(current, winner.seat);
    logEvent(current.tournamentId, "hand_end", {
      winner: winner.seat,
      winnerName: winner.name,
      pot,
      reason: "last_standing",
    });
    return current;
  }

  // River
  const {
    cards: [riverCard],
  } = deal(deck, 1);
  current = advanceStreet(current, [riverCard]);
  logEvent(current.tournamentId, "community", { street: "river", cards: [riverCard], pot: current.pot });
  current = await runBettingRound(current, activeSeats[(dealerIdx + 1) % activeSeats.length]);

  // Showdown
  const showdownPlayers = handActivePlayers(current);
  const evaluated = showdownPlayers.map(p => ({
    ...p,
    result: bestHand(p.cards, current.communityCards),
  }));
  evaluated.sort((a, b) => b.result.rank - a.result.rank);
  const handWinner = evaluated[0];
  const pot = current.pot;

  logEvent(current.tournamentId, "showdown", {
    players: evaluated.map(p => ({
      seat: p.seat,
      name: p.name,
      cards: p.cards,
      handRank: p.result.name,
    })),
  });

  current = awardPot(current, handWinner.seat);
  logEvent(current.tournamentId, "hand_end", {
    winner: handWinner.seat,
    winnerName: handWinner.name,
    pot,
    handRank: handWinner.result.name,
    reason: "showdown",
  });

  return current;
}

export async function runPokerGame(
  tournamentId: number,
  agents: AgentData[],
  onSettle: (winningSeat: number) => Promise<void>,
): Promise<void> {
  initLogFile(tournamentId);
  let state = initGameState(tournamentId, agents);

  logEvent(tournamentId, "game_start", {
    tournamentId,
    players: agents.map(a => ({ seat: a.seat, name: a.name, stack: 1000 })),
  });

  let handsPlayed = 0;
  const MAX_HANDS = 200;

  let lastBlindLevel = -1;

  while (!isTournamentOver(state) && handsPlayed < MAX_HANDS) {
    state = await runHand(state);
    handsPlayed++;

    if (state.blindLevel > lastBlindLevel) {
      lastBlindLevel = state.blindLevel;
      const { smallBlind, bigBlind } = getBlinds(state.blindLevel);
      logEvent(tournamentId, "blinds_up", { level: state.blindLevel, small: smallBlind, big: bigBlind });
    }

    // Detect and log eliminations (stack hit 0 this hand)
    for (const p of state.players) {
      if (p.stack === 0 && !p.folded) {
        state = { ...state, players: state.players.map(sp => (sp.seat === p.seat ? { ...sp, folded: true } : sp)) };
        logEvent(tournamentId, "eliminated", { seat: p.seat, name: p.name });
      }
    }
  }

  const winner = activePlayers(state)[0];
  logEvent(tournamentId, "winner", {
    seat: winner.seat,
    name: winner.name,
    totalPot: winner.stack,
  });

  await onSettle(winner.seat);
}
