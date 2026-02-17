import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { Player, GameState, PlayerAction } from "./types";

// Keep schema flat so providers that reject JSON Schema oneOf still work.
const PokerDecisionSchema = z.object({
  thinking: z
    .string()
    .describe("Your thought process: analyze hand strength, pot odds, opponent patterns, and strategy"),
  decision: z.object({
    action: z.enum(["fold", "check", "call", "raise"]).describe("Your chosen action"),
    raiseAmount: z.number().optional().describe("Amount to raise to when action is raise"),
  }),
});

const POKER_RULES = `
You are playing Texas Hold'em poker. Your goal is to win chips.

Analyze the situation carefully and make the best decision.
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
Min raise: ${state.currentBet * 2 || 40}

Make your decision now.`;
}

export async function getAgentDecision(
  player: Player,
  state: GameState,
  validActions: PlayerAction[],
): Promise<{ action: PlayerAction; raiseAmount?: number; reasoning: string; thinking: string }> {
  const toCall = state.currentBet - player.currentBet;
  const fallback = toCall === 0 ? "check" : "call";

  try {
    console.log(`\n🤖 Calling AI for ${player.name}...`);
    console.log(`📋 Valid actions: ${validActions.join(", ")}`);

    const result = await Promise.race([
      generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: PokerDecisionSchema,
        system: player.systemPrompt + "\n\n" + POKER_RULES,
        prompt: buildPrompt(player, state, validActions),
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI request timeout after 15s")), 15000)),
    ]);

    console.log(`✅ AI Response for ${player.name}:`, JSON.stringify(result.object, null, 2));

    const { thinking, decision } = result.object;
    const { action } = decision;

    // Validate action is in valid actions
    if (!validActions.includes(action as PlayerAction)) {
      console.warn(
        `⚠️  AI returned invalid action "${action}". Valid: ${validActions.join(", ")}. Using fallback: ${fallback}`,
      );
      return {
        action: fallback as PlayerAction,
        reasoning: `${fallback} (invalid action returned)`,
        thinking: thinking || "",
      };
    }

    // Handle raise
    if (decision.action === "raise") {
      const amount = typeof decision.raiseAmount === "number" ? decision.raiseAmount : state.currentBet * 2;
      const finalAmount = Math.min(Math.max(amount, state.currentBet * 2), player.stack);
      return {
        action: "raise",
        raiseAmount: finalAmount,
        reasoning: `raised to ${finalAmount}`,
        thinking: thinking || "",
      };
    }

    // Handle other actions
    const reasoning =
      action === "fold" ? "folded" : action === "check" ? "checked" : action === "call" ? `called ${toCall}` : action;

    return {
      action: action as PlayerAction,
      reasoning,
      thinking: thinking || "",
    };
  } catch (err) {
    console.error(`❌ AGENT DECISION ERROR for ${player.name}:`);
    console.error(`   Error type: ${err instanceof Error ? err.constructor.name : typeof err}`);
    console.error(`   Error message: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`   Stack trace:`, err instanceof Error ? err.stack : "No stack trace");
    console.error(`   Falling back to: ${fallback}`);

    return {
      action: fallback as PlayerAction,
      reasoning: `${fallback} (AI error: ${err instanceof Error ? err.message : "unknown"})`,
      thinking: "",
    };
  }
}
