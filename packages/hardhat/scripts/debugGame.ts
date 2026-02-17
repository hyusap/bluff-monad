/**
 * debugGame.ts — Full tournament + spectator betting test with random decisions.
 * No inference needed. Creates a tournament, enters agents, places spectator bets,
 * runs the game, settles everything, and verifies payouts.
 *
 * Usage: npx hardhat run scripts/debugGame.ts --network localhost
 */
import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { initLogFile, logEvent } from "../engine/eventLogger";
import {
  initGameState,
  startHand,
  postBlinds,
  getValidActions,
  applyAction,
  advanceStreet,
  awardPot,
  activePlayers,
  isTournamentOver,
} from "../engine/gameState";
import { createDeck, shuffle, deal } from "../engine/deck";
import { bestHand } from "../engine/handEvaluator";
import { AgentData, GameState, Player, PlayerAction } from "../engine/types";

// ── Random decision logic (same as testGame.ts) ──────────────────────

function randomDecision(
  player: Player,
  state: GameState,
  validActions: PlayerAction[],
): { action: PlayerAction; raiseAmount?: number } {
  const roll = Math.random();
  if (validActions.includes("check") && roll < 0.6) return { action: "check" };
  if (validActions.includes("fold") && roll < 0.15) return { action: "fold" };
  if (validActions.includes("raise") && roll > 0.75) {
    const amount = state.currentBet * 2 + Math.floor(Math.random() * 50) * 10;
    return { action: "raise", raiseAmount: Math.min(amount, player.stack) };
  }
  if (validActions.includes("call")) return { action: "call" };
  return { action: validActions[0] };
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
    const { action, raiseAmount } = randomDecision(live, current, validActions);
    current = applyAction(current, live.seat, action, raiseAmount);

    logEvent(current.tournamentId, "action", {
      seat: live.seat,
      name: live.name,
      action,
      amount: action === "call" ? current.currentBet - live.currentBet : raiseAmount,
      pot: current.pot,
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
    current = { ...current, players: current.players.map(p => (p.seat === player.seat ? { ...p, cards } : p)) };
  }

  current = postBlinds(current);
  logEvent(current.tournamentId, "hand_start", {
    hand: current.handNumber,
    dealer: current.dealerSeat,
    pot: current.pot,
    stacks: activePlayers(current).map(p => ({ seat: p.seat, name: p.name, stack: p.stack })),
  });

  // Preflop
  current = await runBettingRound(current);
  if (current.players.filter(p => !p.folded).length === 1) {
    const w = current.players.find(p => !p.folded)!;
    current = awardPot(current, w.seat);
    logEvent(current.tournamentId, "hand_end", { winner: w.seat, winnerName: w.name, reason: "last_standing" });
    return current;
  }

  // Flop
  const { cards: flop, remaining: r1 } = deal(deck, 3);
  deck = r1;
  current = advanceStreet(current, flop);
  logEvent(current.tournamentId, "community", { street: "flop", cards: flop });
  current = await runBettingRound(current);
  if (current.players.filter(p => !p.folded).length === 1) {
    const w = current.players.find(p => !p.folded)!;
    current = awardPot(current, w.seat);
    logEvent(current.tournamentId, "hand_end", { winner: w.seat, winnerName: w.name, reason: "last_standing" });
    return current;
  }

  // Turn
  const {
    cards: [turn],
    remaining: r2,
  } = deal(deck, 1);
  deck = r2;
  current = advanceStreet(current, [turn]);
  logEvent(current.tournamentId, "community", { street: "turn", cards: [turn] });
  current = await runBettingRound(current);
  if (current.players.filter(p => !p.folded).length === 1) {
    const w = current.players.find(p => !p.folded)!;
    current = awardPot(current, w.seat);
    logEvent(current.tournamentId, "hand_end", { winner: w.seat, winnerName: w.name, reason: "last_standing" });
    return current;
  }

  // River
  const {
    cards: [river],
  } = deal(deck, 1);
  current = advanceStreet(current, [river]);
  logEvent(current.tournamentId, "community", { street: "river", cards: [river] });
  current = await runBettingRound(current);

  // Showdown
  const sp = current.players.filter(p => !p.folded);
  const ev = sp
    .map(p => ({ ...p, result: bestHand(p.cards, current.communityCards) }))
    .sort((a, b) => b.result.rank - a.result.rank);
  current = awardPot(current, ev[0].seat);
  logEvent(current.tournamentId, "hand_end", {
    winner: ev[0].seat,
    winnerName: ev[0].name,
    handRank: ev[0].result.name,
    reason: "showdown",
  });
  return current;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const signers = await ethers.getSigners();
  const [operator, agent1Signer, agent2Signer, spectator1, spectator2, spectator3] = signers;

  // Load deployed contract addresses
  const vaultPath = path.join(__dirname, "../deployments/localhost/PokerVault.json");
  const bettingPath = path.join(__dirname, "../deployments/localhost/TournamentBetting.json");

  if (!fs.existsSync(vaultPath) || !fs.existsSync(bettingPath)) {
    console.error("❌ Contracts not deployed! Run 'yarn deploy' first.");
    process.exit(1);
  }

  const vaultAddr = JSON.parse(fs.readFileSync(vaultPath, "utf-8")).address;
  const bettingAddr = JSON.parse(fs.readFileSync(bettingPath, "utf-8")).address;

  const vault = await ethers.getContractAt("PokerVault", vaultAddr, operator);
  const betting = await ethers.getContractAt("TournamentBetting", bettingAddr, operator);

  console.log("═══════════════════════════════════════════════");
  console.log("  DEBUG GAME — Tournament + Spectator Betting  ");
  console.log("═══════════════════════════════════════════════");
  console.log(`PokerVault:        ${vaultAddr}`);
  console.log(`TournamentBetting: ${bettingAddr}`);
  console.log(`Operator:          ${operator.address}\n`);

  // ── 1. Create tournament ────────────────────────────────────────────
  console.log("── Step 1: Create tournament ──");
  const tx1 = await vault.createTournament(0, 2);
  const r1 = await tx1.wait();
  const createEvent = r1.logs.find((l: any) => l.fragment?.name === "TournamentCreated");
  const tournamentId = Number(createEvent.args[0]);
  console.log(`Created tournament #${tournamentId} (free, 2 players)\n`);

  // ── 2. Enter agents ─────────────────────────────────────────────────
  console.log("── Step 2: Enter agents ──");
  await (
    await vault.connect(agent1Signer).enterTournament(tournamentId, "AggressiveBot", "You are aggressive", 0)
  ).wait();
  console.log(`  Seat 0: AggressiveBot (${agent1Signer.address})`);
  await (await vault.connect(agent2Signer).enterTournament(tournamentId, "PassiveBot", "You are passive", 0)).wait();
  console.log(`  Seat 1: PassiveBot (${agent2Signer.address})\n`);

  // ── 3. Place spectator bets (while tournament is Open) ──────────────
  console.log("── Step 3: Place spectator bets ──");
  const betAmount = ethers.parseEther("0.01");

  // Spectator 1 & 2 bet on seat 0, Spectator 3 bets on seat 1
  await (await betting.connect(spectator1).placeBet(tournamentId, 0, { value: betAmount })).wait();
  console.log(`  Spectator1 bet 0.01 ETH on seat 0`);

  await (await betting.connect(spectator2).placeBet(tournamentId, 0, { value: betAmount })).wait();
  console.log(`  Spectator2 bet 0.01 ETH on seat 0`);

  await (await betting.connect(spectator3).placeBet(tournamentId, 1, { value: betAmount })).wait();
  console.log(`  Spectator3 bet 0.01 ETH on seat 1`);

  const pool = await betting.totalPool(tournamentId);
  console.log(`  Total pool: ${ethers.formatEther(pool)} ETH\n`);

  // ── 4. Start tournament & run game ──────────────────────────────────
  console.log("── Step 4: Start tournament & run game ──");
  await (await vault.startTournament(tournamentId)).wait();
  console.log("  Tournament started!");

  initLogFile(tournamentId);
  const agents: AgentData[] = [
    { seat: 0, wallet: agent1Signer.address, name: "AggressiveBot", systemPrompt: "aggressive" },
    { seat: 1, wallet: agent2Signer.address, name: "PassiveBot", systemPrompt: "passive" },
  ];

  let state = initGameState(tournamentId, agents);
  logEvent(tournamentId, "game_start", {
    tournamentId,
    players: agents.map(a => ({ seat: a.seat, name: a.name, stack: 1000 })),
  });

  let hands = 0;
  while (!isTournamentOver(state) && hands < 50) {
    state = await runHand(state);
    hands++;
    state.players.forEach(p => {
      if (p.stack === 0 && !p.folded) {
        state = { ...state, players: state.players.map(sp => (sp.seat === p.seat ? { ...sp, folded: true } : sp)) };
        logEvent(tournamentId, "eliminated", { seat: p.seat, name: p.name });
      }
    });
  }

  const winner = activePlayers(state)[0];
  logEvent(tournamentId, "winner", { seat: winner.seat, name: winner.name });
  console.log(`  Game done after ${hands} hands. Winner: ${winner.name} (seat ${winner.seat})\n`);

  // ── 5. Settle tournament on-chain ───────────────────────────────────
  console.log("── Step 5: Settle tournament ──");
  const stx = await vault.settleTournament(tournamentId, winner.seat);
  await stx.wait();
  console.log(`  Tournament settled on-chain.\n`);

  // ── 6. Settle spectator betting ─────────────────────────────────────
  console.log("── Step 6: Settle spectator betting ──");
  const btx = await betting.settleBetting(tournamentId, winner.seat);
  await btx.wait();
  console.log(`  Betting settled. Winning seat: ${winner.seat}\n`);

  // ── 7. Claim winnings ───────────────────────────────────────────────
  console.log("── Step 7: Claim winnings ──");
  const spectators = [
    { signer: spectator1, name: "Spectator1", betSeat: 0 },
    { signer: spectator2, name: "Spectator2", betSeat: 0 },
    { signer: spectator3, name: "Spectator3", betSeat: 1 },
  ];

  for (const s of spectators) {
    if (s.betSeat === winner.seat) {
      const balBefore = await ethers.provider.getBalance(s.signer.address);
      try {
        const ctx = await betting.connect(s.signer).claimWinnings(tournamentId);
        await ctx.wait();
        const balAfter = await ethers.provider.getBalance(s.signer.address);
        const profit = balAfter - balBefore;
        console.log(`  ${s.name}: CLAIMED — net change: ${ethers.formatEther(profit)} ETH`);
      } catch (err: any) {
        console.log(`  ${s.name}: Claim failed — ${err.reason || err.message}`);
      }
    } else {
      try {
        await betting.connect(s.signer).claimWinnings(tournamentId);
        console.log(`  ${s.name}: ERROR — should have reverted (bet on losing seat)`);
      } catch {
        console.log(`  ${s.name}: Correctly reverted (bet on losing seat ${s.betSeat})`);
      }
    }
  }

  // ── 8. Final state ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log("  RESULTS");
  console.log("═══════════════════════════════════════════════");
  const ws = await betting.getWinningSeat(tournamentId);
  const payoutPool = await betting.getPayoutPool(tournamentId);
  console.log(`  Tournament #${tournamentId}`);
  console.log(`  Winner: seat ${winner.seat} (${winner.name})`);
  console.log(`  Betting pool: ${ethers.formatEther(pool)} ETH`);
  console.log(`  Payout pool (after 5% fee): ${ethers.formatEther(payoutPool)} ETH`);
  console.log(`  Winning seat (contract): ${ws}`);
  console.log(`  Hands played: ${hands}`);
  console.log(`\n  View replay: http://localhost:3000/tournaments/${tournamentId}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
