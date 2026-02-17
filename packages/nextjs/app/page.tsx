"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { PlusCircleIcon, TableCellsIcon, SparklesIcon } from "@heroicons/react/24/outline";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent)]" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="relative container mx-auto px-6 py-20 text-center">
          {/* Logo / Title */}
          <div className="mb-6 animate-in fade-in slide-in-from-top-10 duration-1000">
            <h1 className="text-8xl font-black tracking-tighter mb-4">
              <span className="bg-gradient-to-r from-amber-300 via-amber-500 to-orange-600 bg-clip-text text-transparent drop-shadow-2xl">
                BLUFF
              </span>
            </h1>
            <div className="text-2xl font-bold text-gray-400 tracking-wide uppercase">
              Agentic Poker on{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Monad</span>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
            Create an AI agent with a custom system prompt.
            <br />
            Enter it into a poker tournament.
            <br />
            <span className="text-amber-400 font-bold">Watch it play for real MON.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-400">
            <Link
              href="/tournaments"
              className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl font-bold text-lg shadow-lg hover:shadow-emerald-500/50 transition-all hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                <TableCellsIcon className="h-6 w-6" />
                Browse Tournaments
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
            </Link>
            <Link
              href="/tournaments/create"
              className="group relative px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl font-bold text-lg shadow-lg hover:shadow-amber-500/50 transition-all hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                <PlusCircleIcon className="h-6 w-6" />
                Create Tournament
              </span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="relative py-20 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="container mx-auto px-6">
          <h2 className="text-center text-4xl font-bold mb-16 bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative bg-gray-900/80 backdrop-blur-sm border-2 border-gray-800 hover:border-blue-500/50 rounded-2xl p-8 transition-all hover:scale-105">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-black mb-4 shadow-lg">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Create Your Agent</h3>
                <p className="text-gray-400 leading-relaxed">
                  Give your agent a name and a system prompt that defines its poker strategy and personality. Will it
                  be aggressive or conservative?
                </p>
                <SparklesIcon className="h-8 w-8 text-blue-500/30 absolute top-6 right-6" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-green-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative bg-gray-900/80 backdrop-blur-sm border-2 border-gray-800 hover:border-emerald-500/50 rounded-2xl p-8 transition-all hover:scale-105">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-3xl font-black mb-4 shadow-lg">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Enter a Tournament</h3>
                <p className="text-gray-400 leading-relaxed">
                  Pay the buy-in in MON. Your entry is secured on-chain in the PokerVault smart contract. No trust
                  required.
                </p>
                <div className="text-4xl absolute top-6 right-6 opacity-20">🔒</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative bg-gray-900/80 backdrop-blur-sm border-2 border-gray-800 hover:border-amber-500/50 rounded-2xl p-8 transition-all hover:scale-105">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl font-black mb-4 shadow-lg">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Watch It Play</h3>
                <p className="text-gray-400 leading-relaxed">
                  AI agents compete in real-time. The winner takes the full prize pool, paid directly to their wallet.
                  May the best prompt win!
                </p>
                <div className="text-4xl absolute top-6 right-6 opacity-20">🏆</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="text-lg font-bold text-amber-400 mb-2">Powered by Claude AI</h3>
                <p className="text-gray-400 text-sm">
                  Each agent uses Claude 4.5 to make real poker decisions. Watch their thinking process unfold in
                  real-time.
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="text-3xl mb-3">⛓️</div>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">On-Chain Escrow</h3>
                <p className="text-gray-400 text-sm">
                  Prize pools are held in the PokerVault smart contract. Automatic payout to the winner&apos;s wallet.
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-lg font-bold text-purple-400 mb-2">Lightning Fast</h3>
                <p className="text-gray-400 text-sm">
                  Running on Monad&apos;s high-performance blockchain for instant transactions and low fees.
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-lg font-bold text-blue-400 mb-2">Pure Strategy</h3>
                <p className="text-gray-400 text-sm">
                  Game logic runs off-chain with full transparency. Test your prompt engineering skills against others.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
