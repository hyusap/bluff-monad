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
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-white border ${isRed ? "text-red-500 border-red-200" : "text-gray-800 border-gray-300"}`}
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
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-l-4 border-purple-500 p-3 rounded-r-lg">
          <div className="text-purple-300 font-bold text-sm mb-1">🎮 GAME START</div>
          <div className="text-gray-300 text-xs space-y-0.5">
            {players.map(p => (
              <div key={p.name}>
                {p.name}: <span className="font-mono text-amber-300">{p.stack}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "hand_start": {
      const stacks = (parsed.stacks as { name: string; stack: number }[]) || [];
      const blinds = parsed.blinds as { small: number; big: number } | undefined;
      return (
        <div className="border-t-2 border-gray-700 pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-amber-400 font-bold text-sm tracking-wider">♠ HAND #{parsed.hand as number} ♠</div>
            {blinds && (
              <div className="text-gray-500 text-xs font-mono">
                Blinds: {blinds.small}/{blinds.big}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {stacks.map(p => (
              <div key={p.name} className="font-mono">
                <span className="text-gray-300">{p.name}</span>: <span className="text-amber-400">{p.stack}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "blinds_up":
      return (
        <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-2 rounded-r-lg">
          <div className="text-yellow-300 font-bold text-xs">
            ⚡ BLINDS UP! {parsed.small as number}/{parsed.big as number}
          </div>
        </div>
      );

    case "deal":
      return <div className="text-gray-500 text-xs italic">🃏 {parsed.name as string} dealt cards</div>;

    case "community": {
      const street = (parsed.street as string).toUpperCase();
      return (
        <div className="bg-emerald-900/20 border-l-4 border-emerald-500 p-2 rounded-r-lg">
          <div className="flex items-center gap-2">
            <span className="text-emerald-300 font-bold text-sm">{street}</span>
            <Cards cards={parsed.cards as string[]} />
            <span className="text-gray-500 text-xs ml-auto">pot: {parsed.pot as number}</span>
          </div>
        </div>
      );
    }

    case "action": {
      const action = parsed.action as string;
      const thinking = parsed.thinking as string | undefined;

      const actionColors: Record<string, { bg: string; border: string; text: string; button: string }> = {
        fold: { bg: "bg-red-900/10", border: "border-red-500/30", text: "text-red-400", button: "bg-red-600" },
        check: { bg: "bg-blue-900/10", border: "border-blue-500/30", text: "text-blue-400", button: "bg-blue-600" },
        call: { bg: "bg-blue-900/10", border: "border-blue-500/30", text: "text-blue-400", button: "bg-blue-600" },
        raise: {
          bg: "bg-amber-900/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          button: "bg-amber-600",
        },
      };

      const colors = actionColors[action] || actionColors.check;

      return (
        <div className={`${colors.bg} border-l-4 ${colors.border} p-3 rounded-r-lg space-y-2`}>
          {/* Agent name header */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-xs font-bold text-white">
              {(parsed.name as string).slice(0, 2).toUpperCase()}
            </div>
            <div className="font-bold text-sm text-white">{parsed.name as string}</div>
          </div>

          {/* Thinking section */}
          {thinking && thinking.trim() && (
            <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-2.5">
              <div className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">💭 Thinking</div>
              <div className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap italic">{thinking}</div>
            </div>
          )}

          {/* Action button */}
          <div className="flex items-center gap-2">
            <button
              className={`${colors.button} px-3 py-1.5 rounded-lg font-bold text-white text-xs uppercase tracking-wide shadow-lg cursor-default`}
              disabled
            >
              {action}
              {parsed.amount ? ` ${String(parsed.amount)}` : ""}
            </button>
            {Boolean(parsed.reasoning) && typeof parsed.reasoning === "string" && (
              <span className="text-gray-400 text-xs italic">&ldquo;{parsed.reasoning}&rdquo;</span>
            )}
          </div>
        </div>
      );
    }

    case "showdown": {
      const players = (parsed.players as { name: string; cards: string[]; handRank: string }[]) || [];
      return (
        <div className="bg-orange-900/20 border-l-4 border-orange-500 p-3 rounded-r-lg">
          <div className="text-orange-300 font-bold text-sm mb-2">🃏 SHOWDOWN</div>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="font-semibold text-white">{p.name}</span>
                <Cards cards={p.cards} />
                <span className="text-xs text-gray-400">({p.handRank})</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "hand_end":
      return (
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-l-4 border-green-500 p-3 rounded-r-lg mb-2">
          <div className="text-green-300 font-bold text-sm">
            🏆 {parsed.winnerName as string} wins {parsed.pot as number} chips
            {parsed.handRank ? (
              <span className="text-xs text-gray-400 font-normal ml-2">with {parsed.handRank as string}</span>
            ) : null}
          </div>
        </div>
      );

    case "eliminated":
      return (
        <div className="bg-red-900/20 border-l-4 border-red-600 p-2 rounded-r-lg">
          <div className="text-red-400 font-bold text-xs">
            💀 <span className="line-through">{parsed.name as string}</span> ELIMINATED
          </div>
        </div>
      );

    case "winner":
      return (
        <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-4 border-amber-500 p-4 rounded-lg mt-3 mb-3 shadow-lg">
          <div className="text-amber-300 font-bold text-lg text-center flex items-center justify-center gap-2">
            <span className="text-3xl">🏆</span>
            <span>{parsed.name as string} WINS THE TOURNAMENT!</span>
            <span className="text-3xl">🏆</span>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-gray-500 text-xs">
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
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400 text-sm">Loading game feed...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
        <div className="text-gray-500 text-sm text-center">
          No game events yet. The feed will update live once the game starts.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-xl border-2 border-gray-800 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="text-gray-400 text-xs uppercase tracking-wider font-bold">Game Feed</div>
      </div>
      <div className="h-[600px] overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {events.map((event, i) => (
          <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-5 duration-300">
            <div className="text-gray-600 text-[10px] font-mono shrink-0 mt-1 w-14">{formatTime(event.timestamp)}</div>
            <div className="flex-1 min-w-0">
              <EventRow event={event} />
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
