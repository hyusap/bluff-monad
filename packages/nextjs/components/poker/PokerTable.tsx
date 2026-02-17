"use client";

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

function Card({ card, faceDown, size = "md" }: { card?: string; faceDown?: boolean; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-8 h-11",
    md: "w-11 h-[60px]",
    lg: "w-12 h-[66px]",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (faceDown) {
    return <div className={`${sizes[size]} rounded-lg bg-white shadow-md`} />;
  }

  if (!card) return null;

  const rank = card[0];
  const suit = card[1];
  const suitSymbol = suit === "s" ? "\u2660" : suit === "h" ? "\u2665" : suit === "d" ? "\u2666" : "\u2663";
  const isRed = suit === "h" || suit === "d";

  return (
    <div className={`${sizes[size]} rounded-lg bg-white shadow-md flex flex-col items-center justify-center gap-0`}>
      <div className={`${textSizes[size]} font-bold leading-none ${isRed ? "text-[#A0153E]" : "text-[#111111]"}`}>
        {rank}
      </div>
      <div className={`${textSizes[size]} leading-none ${isRed ? "text-[#A0153E]" : "text-[#111111]"}`}>
        {suitSymbol}
      </div>
    </div>
  );
}

function FaceDownPair({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className="relative flex items-center justify-center w-16 h-14">
      <div className={`absolute ${size === "sm" ? "w-8 h-11" : "w-10 h-14"} rounded-lg bg-white shadow-md -rotate-6`} />
      <div className={`absolute ${size === "sm" ? "w-8 h-11" : "w-10 h-14"} rounded-lg bg-white shadow-md rotate-6`} />
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
  namePosition: string;
  cardsPosition: string;
  isCurrentPlayer: boolean;
}) {
  if (!player) return null;

  return (
    <>
      {/* Name */}
      <div className={`absolute ${namePosition} z-10`}>
        <div
          className={`text-sm font-semibold ${
            player.isFolded ? "text-neutral-600" : isCurrentPlayer ? "text-white" : "text-neutral-300"
          }`}
        >
          {player.name}
        </div>
      </div>
      {/* Cards */}
      {player.isActive && !player.isFolded && (
        <div className={`absolute ${cardsPosition} z-10`}>
          <FaceDownPair />
        </div>
      )}
    </>
  );
}

export function PokerTable({ players, communityCards, pot, currentPlayer, maxPlayers }: PokerTableProps) {
  const playersByPosition = Array.from({ length: maxPlayers }, (_, i) => players.find(p => p.seat === i));

  // Positions: name placement and card placement for up to 6 seats
  const layouts: { position: string; namePosition: string; cardsPosition: string }[] = [
    // Seat 0: top-left
    { position: "top-left", namePosition: "top-2 left-12", cardsPosition: "top-14 left-4" },
    // Seat 1: top-right
    { position: "top-right", namePosition: "top-2 right-12", cardsPosition: "top-14 right-4" },
    // Seat 2: bottom-left
    { position: "bottom-left", namePosition: "bottom-2 left-12", cardsPosition: "bottom-14 left-4" },
    // Seat 3: bottom-right
    { position: "bottom-right", namePosition: "bottom-2 right-12", cardsPosition: "bottom-14 right-4" },
    // Seat 4: middle-left
    {
      position: "middle-left",
      namePosition: "top-1/2 -translate-y-1/2 left-2",
      cardsPosition: "top-1/2 translate-y-4 left-2",
    },
    // Seat 5: middle-right
    {
      position: "middle-right",
      namePosition: "top-1/2 -translate-y-1/2 right-2",
      cardsPosition: "top-1/2 translate-y-4 right-2",
    },
  ];

  return (
    <div className="relative w-full aspect-[16/10] max-w-4xl mx-auto">
      {/* Table rim */}
      <div className="absolute inset-0 rounded-[50%] bg-[#2A2A2A] shadow-2xl" />

      {/* Green felt */}
      <div className="absolute inset-3 rounded-[50%] bg-gradient-to-b from-[#2D8C47] to-[#1E6B35] overflow-hidden">
        {/* Community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {communityCards.length > 0
              ? communityCards.map((card, i) => <Card key={i} card={card} size="lg" />)
              : Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-12 h-[66px] rounded-lg bg-white/10" />
                ))}
          </div>

          {/* Pot */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#A0153E] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border border-white/40" />
            </div>
            <span className="text-white font-semibold text-sm">{formatEther(pot)} MON</span>
          </div>
        </div>
      </div>

      {/* Players */}
      {playersByPosition.map((player, i) => {
        if (i >= layouts.length) return null;
        const layout = layouts[i];
        return (
          <PlayerSpot
            key={i}
            player={player}
            namePosition={layout.namePosition}
            cardsPosition={layout.cardsPosition}
            isCurrentPlayer={currentPlayer === i}
          />
        );
      })}
    </div>
  );
}
