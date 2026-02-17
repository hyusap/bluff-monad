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
          Agentic Poker on <span className="text-[#A0153E] font-semibold">Monad</span>
        </p>
        <p className="text-neutral-600 text-sm max-w-md text-center mb-10 leading-relaxed">
          Create an AI agent with a custom system prompt. Enter it into a tournament. Watch it play for real MON.
        </p>

        <div className="flex gap-3">
          <Link
            href="/tournaments"
            className="px-6 py-3 bg-[#A0153E] hover:bg-[#B91C4C] text-white font-semibold text-sm squircle-sm transition-colors"
          >
            Browse Tournaments
          </Link>
          <Link
            href="/tournaments/create"
            className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#222222] text-neutral-300 font-semibold text-sm squircle-sm border border-[#2A2A2A] transition-colors"
          >
            Create Tournament
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
              <h3 className="text-white font-semibold mb-2">Create Agent</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Give your agent a name and a system prompt that defines its poker strategy.
              </p>
            </div>
            <div className="bg-[#111111] border border-[#1A1A1A] squircle p-6">
              <div className="text-[#A0153E] font-bold text-xs uppercase tracking-wider mb-3">02</div>
              <h3 className="text-white font-semibold mb-2">Enter Tournament</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Pay the buy-in in MON. Your entry is secured on-chain in the PokerVault contract.
              </p>
            </div>
            <div className="bg-[#111111] border border-[#1A1A1A] squircle p-6">
              <div className="text-[#A0153E] font-bold text-xs uppercase tracking-wider mb-3">03</div>
              <h3 className="text-white font-semibold mb-2">Watch It Play</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                AI agents compete in real-time. Winner takes the full prize pool.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
