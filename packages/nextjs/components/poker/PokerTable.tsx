"use client";

import type { CSSProperties } from "react";
import { formatEther } from "viem";

type PlayerPosition = {
  name: string;
  stack: bigint;
  cards?: string[];
  isActive: boolean;
  isFolded: boolean;
  currentBet?: number;
  seat: number;
};

type PokerTableProps = {
  players: PlayerPosition[];
  communityCards: string[];
  pot: bigint;
  currentPlayer?: number;
  maxPlayers: number;
};

function parseCard(card?: string) {
  if (!card || card.length < 2) return null;
  const rawRank = card.slice(0, -1).toUpperCase();
  const rank = rawRank === "T" ? "10" : rawRank;
  const suit = card.slice(-1).toLowerCase();
  const suitSymbol = suit === "s" ? "\u2660" : suit === "h" ? "\u2665" : suit === "d" ? "\u2666" : "\u2663";
  const isRed = suit === "h" || suit === "d";
  return { rank, suitSymbol, isRed };
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
    md: "text-lg",
    lg: "text-xl",
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
  if (!parsedCard) return null;

  const textColor = parsedCard.isRed ? "text-[#B42336]" : "text-[#1D1D1D]";

  return (
    <div
      className={`${sizes[size]} relative bg-[#FAFAFA] border border-[#DADADA] shadow-[0_8px_20px_rgba(0,0,0,0.25)] overflow-hidden`}
    >
      <div className={`absolute top-1 left-1 leading-none font-bold ${cornerSizes[size]} ${textColor}`}>
        {parsedCard.rank}
      </div>
      <div className={`absolute top-3 left-1 leading-none ${cornerSizes[size]} ${textColor}`}>
        {parsedCard.suitSymbol}
      </div>

      <div
        className={`absolute inset-0 flex items-center justify-center font-semibold ${centerSizes[size]} ${textColor}`}
      >
        {parsedCard.suitSymbol}
      </div>

      <div className={`absolute bottom-1 right-1 leading-none rotate-180 font-bold ${cornerSizes[size]} ${textColor}`}>
        {parsedCard.rank}
      </div>
      <div className={`absolute bottom-3 right-1 leading-none rotate-180 ${cornerSizes[size]} ${textColor}`}>
        {parsedCard.suitSymbol}
      </div>
    </div>
  );
}

function FaceDownPair({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className={`relative flex items-center justify-center ${size === "sm" ? "w-14 h-11" : "w-20 h-14"}`}>
      <div className="absolute -rotate-8">
        <Card faceDown size={size} />
      </div>
      <div className="absolute rotate-8 translate-x-4">
        <Card faceDown size={size} />
      </div>
    </div>
  );
}

function PlayerSpot({
  player,
  namePosition,
  cardsPosition,
  isCurrentPlayer,
}: {
  player?: PlayerPosition;
  namePosition: CSSProperties;
  cardsPosition: CSSProperties;
  isCurrentPlayer: boolean;
}) {
  if (!player) return null;

  const hasVisibleCards = !!player.cards?.length;
  const folded = player.isFolded;

  return (
    <>
      <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center" style={namePosition}>
        <div
          className={`text-sm font-semibold ${
            folded ? "text-neutral-600" : isCurrentPlayer ? "text-white" : "text-neutral-200"
          }`}
        >
          {player.name}
        </div>
      </div>

      {player.isActive && (
        <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={cardsPosition}>
          {hasVisibleCards ? (
            <div className={`flex items-center gap-1 ${folded ? "opacity-55" : ""}`}>
              {player.cards?.slice(0, 2).map(card => <Card key={`${player.seat}-${card}`} card={card} size="sm" />)}
            </div>
          ) : (
            <div className={folded ? "opacity-55" : ""}>
              <FaceDownPair size="sm" />
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function PokerTable({ players, communityCards, pot, currentPlayer, maxPlayers }: PokerTableProps) {
  const playersByPosition = Array.from({ length: maxPlayers }, (_, i) => players.find(p => p.seat === i));
  const totalSeats = Math.max(maxPlayers, 2);

  return (
    <div className="relative w-full max-w-[760px] aspect-square mx-auto">
      <div className="absolute inset-0 rounded-full bg-[#282A2E] shadow-[0_30px_70px_rgba(0,0,0,0.65)]" />

      <div className="absolute inset-4 rounded-full bg-gradient-to-b from-[#1CA24E] via-[#0F903E] to-[#0A7631] border border-[#2D7F43] overflow-hidden">
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
            <span className="text-white font-semibold text-base tracking-wide">{formatEther(pot)} MON</span>
          </div>
        </div>
      </div>

      {playersByPosition.map((player, i) => {
        const angle = (i / totalSeats) * 2 * Math.PI - Math.PI / 2;
        const namePosition = {
          left: `${50 + Math.cos(angle) * 47}%`,
          top: `${50 + Math.sin(angle) * 47}%`,
        };
        const cardsPosition = {
          left: `${50 + Math.cos(angle) * 36}%`,
          top: `${50 + Math.sin(angle) * 36}%`,
        };

        return (
          <PlayerSpot
            key={i}
            player={player}
            namePosition={namePosition}
            cardsPosition={cardsPosition}
            isCurrentPlayer={currentPlayer === i}
          />
        );
      })}
    </div>
  );
}
