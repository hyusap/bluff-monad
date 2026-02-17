"use client";

import { ReactNode, useEffect, useRef } from "react";
import { GameEvent } from "~~/hooks/useGameFeed";

function formatCard(c: string): ReactNode {
  const rank = c[0];
  const suit = c[1];
  const suitSymbol = suit === "s" ? "\u2660" : suit === "h" ? "\u2665" : suit === "d" ? "\u2666" : "\u2663";
  const isRed = suit === "h" || suit === "d";
  return (
    <span
      key={c}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${isRed ? "text-[#A0153E] bg-[#A0153E]/10" : "text-neutral-300 bg-[#1A1A1A]"}`}
    >
      {rank}
      {suitSymbol}
    </span>
  );
}

function Cards({ cards }: { cards: string[] }) {
  return <span className="inline-flex gap-1">{cards.map(c => formatCard(c))}</span>;
}

function ActionPill({ action, amount }: { action: string; amount?: unknown }) {
  const label = amount ? `${action} ${String(amount)}` : action;

  let colorClass = "bg-neutral-700 text-neutral-300";
  if (action === "fold") colorClass = "bg-red-600 text-white";
  if (action === "raise" || action === "all-in" || action === "allin") colorClass = "bg-green-600 text-white";
  if (action === "call") colorClass = "bg-green-600 text-white";
  if (action === "check") colorClass = "bg-neutral-600 text-neutral-200";

  return <span className={`${colorClass} px-3 py-1 rounded-full text-xs font-semibold capitalize`}>{label}</span>;
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
        <div className="py-2">
          <div className="text-neutral-500 text-xs mb-1">Game started</div>
          <div className="text-neutral-600 text-[11px] space-y-0.5">
            {players.map(p => (
              <div key={p.name}>
                {p.name} <span className="font-mono text-neutral-500">{p.stack}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "hand_start": {
      const blinds = parsed.blinds as { small: number; big: number } | undefined;
      return (
        <div className="border-t border-[#1A1A1A] pt-3 mt-2 pb-1">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 text-xs font-semibold">Hand #{parsed.hand as number}</span>
            {blinds && (
              <span className="text-neutral-600 text-[11px] font-mono">
                {blinds.small}/{blinds.big}
              </span>
            )}
          </div>
        </div>
      );
    }

    case "blinds_up":
      return (
        <div className="py-1">
          <span className="text-yellow-600 text-[11px] font-semibold">
            Blinds up {parsed.small as number}/{parsed.big as number}
          </span>
        </div>
      );

    case "deal":
      return null;

    case "community": {
      const street = (parsed.street as string).toUpperCase();
      return (
        <div className="py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 text-xs font-medium">{street}</span>
            <Cards cards={parsed.cards as string[]} />
          </div>
        </div>
      );
    }

    case "action": {
      const action = parsed.action as string;
      const thinking = parsed.thinking as string | undefined;

      return (
        <div className="py-2 space-y-1.5">
          <div className="text-sm font-semibold text-neutral-200">{parsed.name as string}</div>

          {thinking && thinking.trim() && (
            <div className="bg-[#1A1A1A] rounded-lg px-3 py-2">
              <div className="text-neutral-400 text-xs leading-relaxed whitespace-pre-wrap">{thinking}</div>
            </div>
          )}

          <div>
            <ActionPill action={action} amount={parsed.amount} />
          </div>

          {typeof parsed.reasoning === "string" && parsed.reasoning && (
            <div className="text-neutral-600 text-[11px] italic">{String(parsed.reasoning)}</div>
          )}
        </div>
      );
    }

    case "showdown": {
      const players = (parsed.players as { name: string; cards: string[]; handRank: string }[]) || [];
      return (
        <div className="py-2">
          <div className="text-neutral-400 text-xs font-semibold mb-1.5">Showdown</div>
          <div className="space-y-1">
            {players.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="text-xs text-neutral-300">{p.name}</span>
                <Cards cards={p.cards} />
                <span className="text-[11px] text-neutral-600">({p.handRank})</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "hand_end":
      return (
        <div className="py-1.5">
          <div className="text-green-500 text-xs font-semibold">
            {parsed.winnerName as string} wins {parsed.pot as number}
            {parsed.handRank ? (
              <span className="text-neutral-600 font-normal ml-1">with {parsed.handRank as string}</span>
            ) : null}
          </div>
        </div>
      );

    case "eliminated":
      return (
        <div className="py-1">
          <span className="text-red-500 text-xs font-semibold">
            <span className="line-through">{parsed.name as string}</span> eliminated
          </span>
        </div>
      );

    case "winner":
      return (
        <div className="py-2">
          <div className="text-[#A0153E] font-bold text-sm">{parsed.name as string} wins the tournament</div>
        </div>
      );

    default:
      return (
        <div className="text-neutral-600 text-[11px]">
          [{event.type}] {event.data}
        </div>
      );
  }
}

export function GameFeed({ events, isLoading }: { events: GameEvent[]; isLoading: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neutral-600 text-sm">Loading...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-[#111111] border border-[#1A1A1A] squircle p-6">
        <div className="text-neutral-600 text-sm text-center">Waiting for game to start.</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="px-4 py-3 space-y-0">
      {events.map((event, i) => (
        <EventRow key={i} event={event} />
      ))}
    </div>
  );
}
