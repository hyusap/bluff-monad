"use client";

import { ReactNode, useEffect, useRef } from "react";
import { GameEvent } from "~~/hooks/useGameFeed";

function formatCard(c: string): ReactNode {
  const rank = c[0];
  const suit = c[1];
  const suitSymbol = suit === "s" ? "♠" : suit === "h" ? "♥" : suit === "d" ? "♦" : "♣";
  const isRed = suit === "h" || suit === "d";
  return (
    <span
      key={c}
      className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-bold bg-white border border-base-300 ${isRed ? "text-red-500" : "text-gray-800"}`}
    >
      {rank}
      {suitSymbol}
    </span>
  );
}

function Cards({ cards }: { cards: string[] }) {
  return <span className="inline-flex gap-1">{cards.map(c => formatCard(c))}</span>;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function EventRow({ event }: { event: GameEvent }): ReactNode {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(event.data);
  } catch {
    /* ignore */
  }

  switch (event.type) {
    case "game_start": {
      const players = (parsed.players as { name: string; stack: number }[]) || [];
      return (
        <div className="text-accent font-bold">
          🎮 Game started — {players.map(p => `${p.name} (${p.stack})`).join(", ")}
        </div>
      );
    }
    case "hand_start": {
      const stacks = (parsed.stacks as { name: string; stack: number }[]) || [];
      const blinds = parsed.blinds as { small: number; big: number } | undefined;
      return (
        <div className="mt-3">
          <div className="border-t border-base-content/20 pt-2 text-secondary font-semibold text-xs flex gap-3">
            <span>─── Hand #{parsed.hand as number} ───</span>
            {blinds && (
              <span className="text-base-content/40 font-normal">
                blinds {blinds.small}/{blinds.big}
              </span>
            )}
          </div>
          <div className="text-xs text-base-content/50 flex gap-3 flex-wrap mt-1">
            {stacks.map(p => (
              <span key={p.name}>
                {p.name}: <span className="text-base-content font-mono">{p.stack}</span>
              </span>
            ))}
          </div>
        </div>
      );
    }
    case "blinds_up":
      return (
        <div className="text-warning font-bold text-xs mt-2">
          ⚡ Blinds up! {parsed.small as number}/{parsed.big as number}
        </div>
      );
    case "deal":
      return (
        <div className="text-base-content/40 text-xs">
          🃏 {parsed.name as string} dealt <Cards cards={parsed.cards as string[]} />
        </div>
      );
    case "community": {
      const street = (parsed.street as string).charAt(0).toUpperCase() + (parsed.street as string).slice(1);
      return (
        <div className="text-primary font-semibold">
          {street}: <Cards cards={parsed.cards as string[]} />{" "}
          <span className="text-base-content/50 font-normal text-xs">pot {parsed.pot as number}</span>
        </div>
      );
    }
    case "action": {
      const action = parsed.action as string;
      const colorMap: Record<string, string> = {
        fold: "text-error",
        check: "text-info",
        call: "text-info",
        raise: "text-warning",
      };
      const emoji: Record<string, string> = { fold: "✗", check: "✓", call: "→", raise: "↑" };
      return (
        <div className={`${colorMap[action] || "text-base-content"}`}>
          {emoji[action]} <span className="font-semibold">{parsed.name as string}</span> {action}
          {parsed.amount ? ` ${parsed.amount}` : ""}
          {Boolean(parsed.reasoning) && action !== "fold" && (
            <span className="text-base-content/40 text-xs"> — &ldquo;{String(parsed.reasoning)}&rdquo;</span>
          )}
        </div>
      );
    }
    case "showdown": {
      const players = (parsed.players as { name: string; cards: string[]; handRank: string }[]) || [];
      return (
        <div className="text-warning">
          🃏 Showdown:{" "}
          {players.map(p => (
            <span key={p.name} className="mr-3">
              <span className="font-semibold">{p.name}</span> <Cards cards={p.cards} />{" "}
              <span className="text-xs text-base-content/60">({p.handRank})</span>
            </span>
          ))}
        </div>
      );
    }
    case "hand_end":
      return (
        <div className="text-success font-bold">
          🏆 {parsed.winnerName as string} wins {parsed.pot as number} chips
          {parsed.handRank ? ` with ${parsed.handRank as string}` : ""}
        </div>
      );
    case "eliminated":
      return (
        <div className="text-error">
          💀 <span className="line-through">{parsed.name as string}</span> eliminated
        </div>
      );
    case "winner":
      return (
        <div className="text-success font-bold text-lg border border-success rounded p-2 mt-2">
          🏆 {parsed.name as string} wins the tournament!
        </div>
      );
    default:
      return (
        <div className="text-base-content/40 text-xs">
          [{event.type}] {event.data}
        </div>
      );
  }
}

export function GameFeed({ events, isLoading }: { events: GameEvent[]; isLoading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  if (isLoading) {
    return <div className="text-base-content/50 text-sm">Loading game feed...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-base-content/50 text-sm bg-base-300 rounded-xl p-4">
        No game events yet. The feed will update live once the game starts.
      </div>
    );
  }

  return (
    <div className="bg-base-300 rounded-xl p-4 h-96 overflow-y-auto flex flex-col gap-1.5 text-sm font-mono">
      {events.map((event, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-base-content/30 text-xs shrink-0 mt-0.5 w-16">{formatTime(event.timestamp)}</span>
          <div className="flex-1 min-w-0">
            <EventRow event={event} />
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
