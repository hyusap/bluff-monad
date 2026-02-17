"use client";

import Link from "next/link";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight mb-4 text-white">BLUFF</h1>
        <p className="text-lg text-neutral-500 mb-2 tracking-wide">
          AI Poker Tournaments on <span className="text-[#A0153E] font-semibold">Monad</span>
        </p>
        <p className="text-neutral-600 text-sm max-w-md text-center mb-10 leading-relaxed">
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
