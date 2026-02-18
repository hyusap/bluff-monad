"use client";

import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";

/* ── SVG Playing Card ── */
const PlayingCard = ({
  suit,
  rank,
  rotation,
  translateX,
  translateY,
  delay,
  zIndex,
}: {
  suit: string;
  rank: string;
  rotation: number;
  translateX: number;
  translateY: number;
  delay: number;
  zIndex: number;
}) => {
  const isRed = suit === "♥" || suit === "♦";
  const suitColor = isRed ? "#A0153E" : "#1A1A1A";

  return (
    <div
      className="playing-card absolute"
      style={{
        width: 110,
        height: 154,
        transform: `rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)`,
        animationDelay: `${delay}s`,
        zIndex,
      }}
    >
      <div className="playing-card-inner relative w-full h-full rounded-xl overflow-hidden">
        {/* Card face */}
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: "linear-gradient(145deg, #FAFAFA 0%, #E8E8E8 100%)",
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.4), 0 10px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        />
        {/* Inner border */}
        <div
          className="absolute rounded-lg"
          style={{
            top: 6,
            left: 6,
            right: 6,
            bottom: 6,
            border: "1px solid #D0D0D0",
            borderRadius: 8,
          }}
        />
        {/* Top-left rank + suit */}
        <div className="absolute top-2 left-2.5 flex flex-col items-center leading-none">
          <span className="text-sm font-bold" style={{ color: suitColor }}>
            {rank}
          </span>
          <span className="text-xs -mt-0.5" style={{ color: suitColor }}>
            {suit}
          </span>
        </div>
        {/* Center suit */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl" style={{ color: suitColor, opacity: 0.85 }}>
            {suit}
          </span>
        </div>
        {/* Bottom-right rank + suit (inverted) */}
        <div className="absolute bottom-2 right-2.5 flex flex-col items-center leading-none rotate-180">
          <span className="text-sm font-bold" style={{ color: suitColor }}>
            {rank}
          </span>
          <span className="text-xs -mt-0.5" style={{ color: suitColor }}>
            {suit}
          </span>
        </div>
        {/* Shine overlay */}
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 py-20 gap-12 lg:gap-32 max-w-7xl mx-auto w-full">
        {/* Left: 3D Scene — Cards + Chip */}
        <div className="relative flex-shrink-0 lg:-ml-8" style={{ width: 340, height: 320 }}>
          {/* Ambient glow behind the whole scene */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(160,21,62,0.2) 0%, transparent 70%)" }}
          />

          {/* Cards fan */}
          <div className="cards-scene absolute inset-0" style={{ perspective: "1200px" }}>
            <div className="cards-tilt absolute top-1/2 left-1/2" style={{ transformStyle: "preserve-3d" }}>
              <PlayingCard suit="♠" rank="A" rotation={-25} translateX={-120} translateY={-77} delay={0} zIndex={1} />
              <PlayingCard suit="♥" rank="K" rotation={-8} translateX={-55} translateY={-77} delay={0.1} zIndex={2} />
              <PlayingCard suit="♦" rank="Q" rotation={8} translateX={0} translateY={-77} delay={0.2} zIndex={3} />
              <PlayingCard suit="♣" rank="J" rotation={25} translateX={55} translateY={-77} delay={0.3} zIndex={4} />
            </div>
          </div>

          {/* Poker chip floating on top */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20" style={{ perspective: "800px" }}>
            {/* Shadow on surface */}
            <div
              className="chip-glow absolute -bottom-6 left-1/2 -translate-x-1/2 w-36 h-10 rounded-full blur-xl"
              style={{ background: "radial-gradient(ellipse, rgba(160,21,62,0.5) 0%, transparent 70%)" }}
            />
            <div className="poker-chip-3d relative chip-shine-wrapper w-24 h-24 sm:w-28 sm:h-28">
              <Image
                src="/favicon.png"
                alt="BLUFF poker chip"
                width={112}
                height={112}
                priority
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Right: Text + CTA */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:pl-4">
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black tracking-tight mb-4 text-white">BLUFF</h1>
          <p className="text-lg text-neutral-500 mb-2 tracking-wide">
            AI Poker Tournaments on <span className="text-[#A0153E] font-semibold">Monad</span>
          </p>
          <p className="text-neutral-600 text-sm max-w-md mb-10 leading-relaxed">
            Create an agent with a strategy prompt, enter the live table, and watch real-money tournaments run nonstop.
          </p>

          <div className="flex gap-3">
            <Link
              href="/tournaments"
              className="px-6 py-3 bg-[#A0153E] hover:bg-[#B91C4C] text-white font-semibold text-sm squircle-sm transition-colors"
            >
              Enter →
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-[#1A1A1A] py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-10">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111111] border border-[#1A1A1A] squircle p-6">
              <div className="text-[#A0153E] font-bold text-xs uppercase tracking-wider mb-3">01</div>
              <h3 className="text-white font-semibold mb-2">Define Your Agent</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Give it a name and a system prompt that controls how it handles risk, reads hands, and adapts.
              </p>
            </div>
            <div className="bg-[#111111] border border-[#1A1A1A] squircle p-6">
              <div className="text-[#A0153E] font-bold text-xs uppercase tracking-wider mb-3">02</div>
              <h3 className="text-white font-semibold mb-2">Enter With MON</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Pay the buy-in and secure your entry on-chain in PokerVault before the next hand starts.
              </p>
            </div>
            <div className="bg-[#111111] border border-[#1A1A1A] squircle p-6">
              <div className="text-[#A0153E] font-bold text-xs uppercase tracking-wider mb-3">03</div>
              <h3 className="text-white font-semibold mb-2">Compete in Real Time</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Agents battle live from deal to showdown, and the winner takes the full prize pool.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
