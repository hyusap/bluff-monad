/**
 * testGame.ts — creates a tournament, enters 2 mock agents, starts it,
 * and runs the full game loop with random decisions (no Claude API needed).
 * Use this to verify the live feed UI works before adding a real API key.
 */
import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { initLogFile, logEvent } from "../engine/eventLogger";
import { initGameState, startHand, postBlinds, getValidActions, applyAction, advanceStreet, awardPot, activePlayers, isTournamentOver } from "../engine/gameState";
import { createDeck, shuffle, deal } from "../engine/deck";
import { bestHand } from "../engine/handEvaluator";
import { AgentData, GameState, Player, PlayerAction } from "../engine/types";

const CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

// Random agent — picks a valid action at random with some basic logic
function randomDecision(player: Player, state: GameState, validActions: PlayerAction[]): { action: PlayerAction; raiseAmount?: number; reasoning: string } {
  const roll = Math.random();
  if (validActions.includes("check") && roll < 0.6) return { action: "check", reasoning: "checking it" };
  if (validActions.includes("fold") && roll < 0.15) return { action: "fold", reasoning: "not feeling it" };
  if (validActions.includes("raise") && roll > 0.75) {
    const amount = state.currentBet * 2 + Math.floor(Math.random() * 50) * 10;
    return { action: "raise", raiseAmount: Math.min(amount, player.stack), reasoning: "feeling lucky" };
  }
  if (validActions.includes("call")) return { action: "call", reasoning: "calling" };
  return { action: validActions[0], reasoning: "default" };
}

async function runBettingRound(state: GameState): Promise<GameState> {
  const active = activePlayers(state).filter(p => !p.allIn);
  if (active.length <= 1) return state;

  let queue = [...active];
  let current = state;
  let lastRaiserSeat: number | null = null;

  while (queue.length > 0) {
    const player = queue.shift()!;
    const live = current.players.find(p => p.seat === player.seat)!;
    if (live.folded || live.allIn) continue;
    if (current.players.filter(p => !p.folded).length === 1) break;

    const validActions = getValidActions(live, current);
    const { action, raiseAmount, reasoning } = randomDecision(live, current, validActions);
    current = applyAction(current, live.seat, action, raiseAmount);

    logEvent(current.tournamentId, "action", {
      seat: live.seat, name: live.name, action,
      amount: action === "call" ? current.currentBet - live.currentBet : raiseAmount,
      pot: current.pot, reasoning,
    });

    if (action === "raise") {
      lastRaiserSeat = live.seat;
      queue = activePlayers(current).filter(p => !p.allIn && p.seat !== live.seat);
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
    current = { ...current, players: current.players.map(p => p.seat === player.seat ? { ...p, cards } : p) };
    logEvent(current.tournamentId, "deal", { seat: player.seat, name: player.name, cards });
  }

  current = postBlinds(current);
  logEvent(current.tournamentId, "hand_start", {
    hand: current.handNumber, dealer: current.dealerSeat, pot: current.pot,
    stacks: activePlayers(current).map(p => ({ seat: p.seat, name: p.name, stack: p.stack })),
  });

  // Preflop
  current = await runBettingRound(current);
  if (current.players.filter(p => !p.folded).length === 1) {
    const w = current.players.find(p => !p.folded)!;
    current = awardPot(current, w.seat);
    logEvent(current.tournamentId, "hand_end", { winner: w.seat, winnerName: w.name, pot: state.pot, reason: "last_standing" });
    return current;
  }

  // Flop
  const { cards: flop, remaining: r1 } = deal(deck, 3); deck = r1;
  current = advanceStreet(current, flop);
  logEvent(current.tournamentId, "community", { street: "flop", cards: flop, pot: current.pot });
  current = await runBettingRound(current);
  if (current.players.filter(p => !p.folded).length === 1) {
    const w = current.players.find(p => !p.folded)!;
    current = awardPot(current, w.seat); logEvent(current.tournamentId, "hand_end", { winner: w.seat, winnerName: w.name, pot: state.pot, reason: "last_standing" }); return current;
  }

  // Turn
  const { cards: [turn], remaining: r2 } = deal(deck, 1); deck = r2;
  current = advanceStreet(current, [turn]);
  logEvent(current.tournamentId, "community", { street: "turn", cards: [turn], pot: current.pot });
  current = await runBettingRound(current);
  if (current.players.filter(p => !p.folded).length === 1) {
    const w = current.players.find(p => !p.folded)!;
    current = awardPot(current, w.seat); logEvent(current.tournamentId, "hand_end", { winner: w.seat, winnerName: w.name, pot: state.pot, reason: "last_standing" }); return current;
  }

  // River
  const { cards: [river] } = deal(deck, 1);
  current = advanceStreet(current, [river]);
  logEvent(current.tournamentId, "community", { street: "river", cards: [river], pot: current.pot });
  current = await runBettingRound(current);

  // Showdown
  const sp = current.players.filter(p => !p.folded);
  const ev = sp.map(p => ({ ...p, result: bestHand(p.cards, current.communityCards) })).sort((a, b) => b.result.rank - a.result.rank);
  logEvent(current.tournamentId, "showdown", { players: ev.map(p => ({ seat: p.seat, name: p.name, cards: p.cards, handRank: p.result.name })) });
  current = awardPot(current, ev[0].seat);
  logEvent(current.tournamentId, "hand_end", { winner: ev[0].seat, winnerName: ev[0].name, pot: state.pot, handRank: ev[0].result.name, reason: "showdown" });
  return current;
}

async function main() {
  const [operator] = await ethers.getSigners();
  const vault = await ethers.getContractAt("PokerVault", CONTRACT_ADDRESS, operator);

  // Create tournament
  const tx1 = await vault.createTournament(0, 2);
  const r1 = await tx1.wait();
  const event = r1.logs.find((l: any) => l.fragment?.name === "TournamentCreated");
  const tournamentId = Number(event.args[0]);
  console.log(`Created tournament #${tournamentId}`);

  // Enter 2 agents using different signers
  const signers = await ethers.getSigners();
  const agent1 = signers[1];
  const agent2 = signers[2];

  await (await vault.connect(agent1).enterTournament(tournamentId, "GamblerBot", "You are an aggressive poker player. Always raise or call, rarely fold.")).wait();
  await (await vault.connect(agent2).enterTournament(tournamentId, "TightAlex", "You are a conservative poker player. Only play premium hands. Fold often.")).wait();
  console.log("2 agents entered");

  // Start tournament
  await (await vault.startTournament(tournamentId)).wait();
  console.log("Tournament started — running game...");

  // Run the game with random decisions
  initLogFile(tournamentId);
  const agents: AgentData[] = [
    { seat: 0, wallet: agent1.address, name: "GamblerBot", systemPrompt: "aggressive" },
    { seat: 1, wallet: agent2.address, name: "TightAlex", systemPrompt: "conservative" },
  ];

  let state = initGameState(tournamentId, agents);
  logEvent(tournamentId, "game_start", { tournamentId, players: agents.map(a => ({ seat: a.seat, name: a.name, stack: 1000 })) });

  let hands = 0;
  while (!isTournamentOver(state) && hands < 50) {
    state = await runHand(state);
    hands++;
    state.players.forEach(p => {
      if (p.stack === 0 && !p.folded) {
        state = { ...state, players: state.players.map(sp => sp.seat === p.seat ? { ...sp, folded: true } : sp) };
        logEvent(tournamentId, "eliminated", { seat: p.seat, name: p.name });
      }
    });
    // Small delay so frontend can poll updates
    await new Promise(r => setTimeout(r, 200));
  }

  const winner = activePlayers(state)[0];
  logEvent(tournamentId, "winner", { seat: winner.seat, name: winner.name, totalPot: winner.stack });

  // Settle on-chain
  const tx = await vault.settleTournament(tournamentId, winner.seat);
  await tx.wait();
  console.log(`\n✅ Tournament #${tournamentId} settled. Winner: ${winner.name} (seat ${winner.seat})`);
  console.log(`Open http://localhost:3000/tournaments/${tournamentId} to see the replay.`);
}

main().catch(err => { console.error(err); process.exit(1); });
