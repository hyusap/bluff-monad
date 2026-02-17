import Anthropic from "@anthropic-ai/sdk";
import { Player, GameState, PlayerAction } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const POKER_RULES = `
You are playing Texas Hold'em poker. Your goal is to win chips.

First, think through your decision in a <thinking> section:
- Analyze your hand strength
- Consider the pot odds and betting patterns
- Evaluate your opponents' likely hands
- Decide on your strategy

Then respond with your action in this exact format:
  fold
  check
  call
  raise <amount>
`.trim();

function formatCards(cards: string[]): string {
  return cards
    .map(c => {
      const suit = c[1] === "s" ? "♠" : c[1] === "h" ? "♥" : c[1] === "d" ? "♦" : "♣";
      return `${c[0]}${suit}`;
    })
    .join(" ");
}

function buildPrompt(player: Player, state: GameState, validActions: PlayerAction[]): string {
  const others = state.players
    .filter(p => p.seat !== player.seat)
    .map(p => {
      if (p.folded) return `  - ${p.name} (seat ${p.seat}): FOLDED`;
      if (p.allIn) return `  - ${p.name} (seat ${p.seat}): ALL-IN, stack 0`;
      return `  - ${p.name} (seat ${p.seat}): stack ${p.stack}, current bet ${p.currentBet}`;
    })
    .join("\n");

  const toCall = state.currentBet - player.currentBet;

  return `Your hand: ${formatCards(player.cards)}
Community cards: ${state.communityCards.length ? formatCards(state.communityCards) : "none (preflop)"}
Street: ${state.street}
Pot: ${state.pot}
Your stack: ${player.stack}
Amount to call: ${toCall}
Other players:
${others}

Valid actions: ${validActions.join(", ")}
Min raise: ${state.currentBet * 2 || 40}`;
}

function parseResponse(text: string, validActions: PlayerAction[], player: Player, state: GameState): { action: PlayerAction; raiseAmount?: number; reasoning: string; thinking: string } {
  const toCall = state.currentBet - player.currentBet;

  // Extract thinking section
  const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
  const thinking = thinkingMatch ? thinkingMatch[1].trim() : "";

  // Get the action line (after thinking or first line)
  const afterThinking = thinkingMatch ? text.split("</thinking>")[1] : text;
  const line = afterThinking.trim().toLowerCase().split("\n").find(l => l.trim()) || "";

  if (validActions.includes("fold") && line.startsWith("fold")) {
    return { action: "fold", reasoning: "folded", thinking };
  }
  if (validActions.includes("check") && line.startsWith("check")) {
    return { action: "check", reasoning: "checked", thinking };
  }
  if (validActions.includes("call") && line.startsWith("call")) {
    return { action: "call", reasoning: `called ${toCall}`, thinking };
  }
  if (validActions.includes("raise") && line.startsWith("raise")) {
    const parts = line.split(/\s+/);
    const amount = parseInt(parts[1], 10);
    const raiseAmount = isNaN(amount) ? state.currentBet * 2 : Math.min(amount, player.stack);
    return { action: "raise", raiseAmount, reasoning: `raised to ${raiseAmount}`, thinking };
  }

  // Fallback
  const fallback = toCall === 0 ? "check" : (validActions.includes("call") ? "call" : "fold");
  return { action: fallback as PlayerAction, reasoning: `${fallback} (default)`, thinking };
}

export async function getAgentDecision(
  player: Player,
  state: GameState,
  validActions: PlayerAction[],
): Promise<{ action: PlayerAction; raiseAmount?: number; reasoning: string; thinking: string }> {
  const toCall = state.currentBet - player.currentBet;
  const fallback = toCall === 0 ? "check" : "call";

  try {
    const response = await Promise.race([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        thinking: {
          type: "enabled",
          budget_tokens: 1024
        },
        system: player.systemPrompt + "\n\n" + POKER_RULES,
        messages: [{ role: "user", content: buildPrompt(player, state, validActions) }],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
    ]);

    const text = (response as Anthropic.Message).content[0].type === "text"
      ? (response as Anthropic.Message).content[0].text
      : fallback;

    return parseResponse(text, validActions, player, state);
  } catch (err) {
    console.warn(`Agent ${player.name} decision failed: ${err}. Defaulting to ${fallback}.`);
    return { action: fallback as PlayerAction, reasoning: `${fallback} (timeout/error)`, thinking: "" };
  }
}
