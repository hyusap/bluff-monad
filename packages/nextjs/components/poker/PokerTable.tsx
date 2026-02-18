"use client";

import type { CSSProperties } from "react";

type PlayerPosition = {
  name: string;
  stack: number;
  cards?: string[];
  isActive: boolean;
  isFolded: boolean;
  currentBet?: number;
  seat: number;
};

type PokerTableProps = {
  players: PlayerPosition[];
  communityCards: string[];
  pot: number;
  currentPlayer?: number;
  maxPlayers: number;
};

type SeatLayout = {
  namePosition: CSSProperties;
  cardsPosition: CSSProperties;
  cardsRotation: number;
};

const DEFAULT_LAYOUTS: SeatLayout[] = [
  { namePosition: { left: "18%", top: "21%" }, cardsPosition: { left: "18%", top: "8%" }, cardsRotation: -14 },
  { namePosition: { left: "82%", top: "21%" }, cardsPosition: { left: "82%", top: "8%" }, cardsRotation: 14 },
  { namePosition: { left: "18%", top: "79%" }, cardsPosition: { left: "18%", top: "92%" }, cardsRotation: -14 },
  { namePosition: { left: "82%", top: "79%" }, cardsPosition: { left: "82%", top: "92%" }, cardsRotation: 14 },
  { namePosition: { left: "-3%", top: "63%" }, cardsPosition: { left: "5%", top: "50%" }, cardsRotation: -90 },
  { namePosition: { left: "103%", top: "63%" }, cardsPosition: { left: "95%", top: "50%" }, cardsRotation: 90 },
];

const TWO_PLAYER_LAYOUTS: SeatLayout[] = [
  { namePosition: { left: "50%", top: "21%" }, cardsPosition: { left: "50%", top: "8%" }, cardsRotation: 0 },
  { namePosition: { left: "50%", top: "79%" }, cardsPosition: { left: "50%", top: "92%" }, cardsRotation: 0 },
];

const THREE_PLAYER_LAYOUTS: SeatLayout[] = [
  { namePosition: { left: "50%", top: "21%" }, cardsPosition: { left: "50%", top: "8%" }, cardsRotation: 0 },
  { namePosition: { left: "18%", top: "79%" }, cardsPosition: { left: "18%", top: "92%" }, cardsRotation: -14 },
  { namePosition: { left: "82%", top: "79%" }, cardsPosition: { left: "82%", top: "92%" }, cardsRotation: 14 },
];

function parseCard(card?: string) {
  if (!card || card.length < 2) return null;
  const rawRank = card.slice(0, -1).toUpperCase();
  const rank = rawRank === "T" ? "10" : rawRank;
  const suit = card.slice(-1).toLowerCase();
  const suitSymbol = suit === "s" ? "\u2660" : suit === "h" ? "\u2665" : suit === "d" ? "\u2666" : "\u2663";
  const isRed = suit === "h" || suit === "d";
  return { rank, suitSymbol, isRed };
}

function formatChips(chips: number) {
  return Math.max(0, Math.floor(chips)).toLocaleString();
}

function Card({ card, faceDown, size = "md" }: { card?: string; faceDown?: boolean; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-10 h-14 rounded-lg",
    md: "w-12 h-16 rounded-xl",
    lg: "w-14 h-20 rounded-xl",
  };

  const cornerSizes = {
    sm: "text-[10px]",
    md: "text-[11px]",
    lg: "text-xs",
  };

  const centerSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  if (faceDown) {
    return (
      <div
        className={`${sizes[size]} relative bg-gradient-to-br from-[#203257] to-[#0D182E] border border-[#4D6299] shadow-[0_8px_24px_rgba(0,0,0,0.35)] overflow-hidden`}
      >
        <div className="absolute inset-1 rounded-[inherit] border border-[#8CA1D4]/40" />
        <div className="absolute inset-3 rounded-[inherit] border border-[#B5C4EA]/30" />
      </div>
    );
  }

  const parsedCard = parseCard(card);
  if (!parsedCard) {
    return (
      <div
        className={`${sizes[size]} relative bg-[#FAFAFA] border border-[#DADADA] shadow-[0_8px_20px_rgba(0,0,0,0.25)] overflow-hidden flex items-center justify-center text-neutral-400`}
      >
        <span className="text-base font-semibold">?</span>
      </div>
    );
  }

  const textColor = parsedCard.isRed ? "text-[#B42336]" : "text-[#1D1D1D]";

  return (
    <div
      className={`${sizes[size]} relative bg-[#FAFAFA] border border-[#DADADA] shadow-[0_8px_20px_rgba(0,0,0,0.25)] overflow-hidden`}
    >
      <div className={`absolute top-1 left-1 leading-none font-bold ${cornerSizes[size]} ${textColor}`}>
        {parsedCard.rank}
      </div>

      <div
        className={`absolute inset-0 flex items-center justify-center font-semibold ${centerSizes[size]} ${textColor}`}
      >
        {parsedCard.suitSymbol}
      </div>

      <div className={`absolute bottom-1 right-1 leading-none rotate-180 font-bold ${cornerSizes[size]} ${textColor}`}>
        {parsedCard.rank}
      </div>
    </div>
  );
}

function FaceUpPair({ cards }: { cards: string[] }) {
  const cardA = cards[0] ?? "??";
  const cardB = cards[1] ?? "??";

  return (
    <div className="relative w-[86px] h-16">
      <div className="absolute left-0 top-0 -rotate-10">
        <Card card={cardA} size="sm" />
      </div>
      <div className="absolute left-8 top-0 rotate-10">
        <Card card={cardB} size="sm" />
      </div>
    </div>
  );
}

function PlayerSpot({
  player,
  namePosition,
  cardsPosition,
  cardsRotation,
  isCurrentPlayer,
}: {
  player?: PlayerPosition;
  namePosition: CSSProperties;
  cardsPosition: CSSProperties;
  cardsRotation: number;
  isCurrentPlayer: boolean;
}) {
  if (!player) return null;

  const folded = player.isFolded;
  const visibleCards = player.cards?.length ? player.cards.slice(0, 2) : ["??", "??"];

  return (
    <>
      <div
        className="absolute z-30 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
        style={namePosition}
      >
        <div
          className={`min-w-[122px] rounded-lg border px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm ${
            isCurrentPlayer
              ? "bg-[#A0153E]/18 border-[#A0153E]/60"
              : folded
                ? "bg-black/55 border-[#2A2A2A]/75"
                : "bg-black/70 border-[#2A2A2A]"
          }`}
        >
          <div
            className={`text-sm font-semibold leading-tight ${
              folded ? "text-neutral-500" : isCurrentPlayer ? "text-white" : "text-neutral-100"
            }`}
          >
            {player.name}
          </div>
          <div className={`text-[11px] leading-tight ${folded ? "text-neutral-500" : "text-neutral-300"}`}>
            {formatChips(player.stack)} chips
          </div>
        </div>
      </div>

      {player.isActive && (
        <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={cardsPosition}>
          <div className={folded ? "opacity-55" : ""} style={{ transform: `rotate(${cardsRotation}deg)` }}>
            <FaceUpPair cards={visibleCards} />
          </div>
        </div>
      )}
    </>
  );
}

export function PokerTable({ players, communityCards, pot, currentPlayer, maxPlayers }: PokerTableProps) {
  const playersByPosition = Array.from({ length: maxPlayers }, (_, i) => players.find(p => p.seat === i));
  const layouts = maxPlayers === 2 ? TWO_PLAYER_LAYOUTS : maxPlayers === 3 ? THREE_PLAYER_LAYOUTS : DEFAULT_LAYOUTS;

  return (
    <div className="relative w-full max-w-[720px] aspect-[16/10] mx-auto">
      <div className="absolute inset-0 rounded-[96px] bg-[#282A2E] shadow-[0_30px_70px_rgba(0,0,0,0.65)]" />

      <div className="absolute inset-6 rounded-[82px] bg-[#0F9040] border border-[#2D7F43] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          <div className="flex gap-2 md:gap-2.5">
            {Array.from({ length: 5 }).map((_, i) =>
              communityCards[i] ? (
                <Card key={i} card={communityCards[i]} size="lg" />
              ) : (
                <div
                  key={i}
                  className="w-14 h-20 rounded-xl bg-white/12 border border-white/8 shadow-[inset_0_1px_4px_rgba(0,0,0,0.15)]"
                />
              ),
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#A0153E] border border-[#C41E56] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border border-white/60" />
            </div>
            <span className="text-white font-semibold text-base tracking-wide">POT {formatChips(pot)}</span>
          </div>
        </div>
      </div>

      {playersByPosition.map((player, i) => {
        const layout = layouts[i] ?? DEFAULT_LAYOUTS[i % DEFAULT_LAYOUTS.length];

        return (
          <PlayerSpot
            key={i}
            player={player}
            namePosition={layout.namePosition}
            cardsPosition={layout.cardsPosition}
            cardsRotation={layout.cardsRotation}
            isCurrentPlayer={currentPlayer === i}
          />
        );
      })}
    </div>
  );
}
