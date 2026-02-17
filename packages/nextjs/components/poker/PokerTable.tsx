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

function Card({ card, faceDown }: { card?: string; faceDown?: boolean }) {
  if (faceDown) {
    return (
      <div className="relative w-12 h-16 rounded-lg bg-gradient-to-br from-red-700 via-red-800 to-red-950 border-2 border-red-900 shadow-lg">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-10 rounded border-2 border-red-600/30 backdrop-blur-sm" />
        </div>
      </div>
    );
  }

  if (!card) return null;

  const rank = card[0];
  const suit = card[1];
  const suitSymbol = suit === "s" ? "♠" : suit === "h" ? "♥" : suit === "d" ? "♦" : "♣";
  const isRed = suit === "h" || suit === "d";

  return (
    <div
      className={`relative w-12 h-16 rounded-lg bg-white border-2 ${isRed ? "border-red-200" : "border-gray-300"} shadow-lg flex flex-col items-center justify-center transition-transform hover:scale-105`}
    >
      <div className={`text-2xl font-bold ${isRed ? "text-red-600" : "text-gray-900"}`}>{rank}</div>
      <div className={`text-xl ${isRed ? "text-red-600" : "text-gray-900"}`}>{suitSymbol}</div>
    </div>
  );
}

function PlayerSpot({ player, position, isCurrentPlayer }: { player?: PlayerPosition; position: string; isCurrentPlayer: boolean }) {
  if (!player) {
    return (
      <div className={`absolute ${position}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-700 bg-black/30 backdrop-blur-sm" />
          <div className="text-gray-600 text-xs font-medium">Empty</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute ${position} transition-all duration-300 ${isCurrentPlayer ? "scale-110" : ""}`}>
      <div className="flex flex-col items-center gap-2">
        {/* Cards */}
        <div className="flex gap-1 mb-1">
          {player.isActive && !player.isFolded ? (
            <>
              <Card faceDown />
              <Card faceDown />
            </>
          ) : player.isFolded ? (
            <div className="text-gray-600 text-xs">FOLDED</div>
          ) : null}
        </div>

        {/* Avatar */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${
            isCurrentPlayer
              ? "bg-gradient-to-br from-amber-400 to-orange-500 ring-4 ring-amber-300/50 shadow-lg shadow-amber-500/50"
              : player.isActive
                ? "bg-gradient-to-br from-gray-700 to-gray-900 ring-2 ring-gray-600"
                : "bg-gray-800/50 ring-2 ring-gray-700"
          }`}
        >
          {player.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Name & Stack */}
        <div className="flex flex-col items-center">
          <div
            className={`font-bold text-sm ${isCurrentPlayer ? "text-amber-300" : player.isActive ? "text-white" : "text-gray-500"}`}
          >
            {player.name}
          </div>
          <div className="text-xs text-gray-400 font-mono">{formatEther(player.stack)} MON</div>
          {player.currentBet && player.currentBet > 0 && (
            <div className="mt-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded-full text-xs text-amber-300 font-bold">
              {player.currentBet}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PokerTable({ players, communityCards, pot, currentPlayer, maxPlayers }: PokerTableProps) {
  // Position mapping for 2-6 players (adjust angles around table)
  const positions = [
    "bottom-4 left-1/2 -translate-x-1/2", // Seat 0: Bottom center
    "top-4 right-8", // Seat 1: Top right
    "top-4 left-8", // Seat 2: Top left
    "bottom-4 left-8", // Seat 3: Bottom left
    "bottom-4 right-8", // Seat 4: Bottom right
    "top-1/2 right-4 -translate-y-1/2", // Seat 5: Middle right
  ];

  // Map players to positions
  const playersByPosition = Array.from({ length: maxPlayers }, (_, i) => players.find(p => p.seat === i));

  return (
    <div className="relative w-full aspect-[16/10] max-w-5xl mx-auto">
      {/* Table felt */}
      <div className="absolute inset-0 rounded-[50%] bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 shadow-2xl border-8 border-gray-900 overflow-hidden">
        {/* Felt texture overlay */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.4),transparent)]" />

        {/* Inner table border */}
        <div className="absolute inset-12 rounded-[50%] border-4 border-emerald-600/30" />

        {/* Community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {communityCards.length > 0 ? (
              communityCards.map((card, i) => <Card key={i} card={card} />)
            ) : (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-16 rounded-lg border-2 border-dashed border-emerald-600/30 bg-emerald-900/20"
                />
              ))
            )}
          </div>

          {/* Pot */}
          <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border-2 border-amber-500/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold shadow-lg">
              🪙
            </div>
            <div className="text-amber-300 font-bold text-lg tracking-wider">{formatEther(pot)} MON</div>
          </div>
        </div>
      </div>

      {/* Players */}
      {playersByPosition.map((player, i) => (
        <PlayerSpot key={i} player={player} position={positions[i]} isCurrentPlayer={currentPlayer === i} />
      ))}
    </div>
  );
}
