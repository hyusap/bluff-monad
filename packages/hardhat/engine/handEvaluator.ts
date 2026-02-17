import { Card } from "./types";

const RANK_ORDER: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

function rank(card: Card): number { return RANK_ORDER[card[0]]; }
function suit(card: Card): string { return card[1]; }

function combinations(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ];
}

function evaluate5(cards: Card[]): { rank: number; name: string } {
  const ranks = cards.map(rank).sort((a, b) => b - a);
  const suits = cards.map(suit);
  const isFlush = suits.every(s => s === suits[0]);

  // Check straight (including A-low: A-2-3-4-5)
  let isStraight = false;
  let straightHigh = ranks[0];
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
  } else if (JSON.stringify(ranks) === JSON.stringify([14, 5, 4, 3, 2])) {
    isStraight = true;
    straightHigh = 5; // wheel
  }

  const counts: Record<number, number> = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const freq = Object.values(counts).sort((a, b) => b - a);

  if (isFlush && isStraight) return { rank: straightHigh === 14 ? 900 + straightHigh : 800 + straightHigh, name: straightHigh === 14 ? "Royal Flush" : "Straight Flush" };
  if (freq[0] === 4) return { rank: 700 + ranks[0], name: "Four of a Kind" };
  if (freq[0] === 3 && freq[1] === 2) return { rank: 600 + ranks[0], name: "Full House" };
  if (isFlush) return { rank: 500 + ranks[0], name: "Flush" };
  if (isStraight) return { rank: 400 + straightHigh, name: "Straight" };
  if (freq[0] === 3) return { rank: 300 + ranks[0], name: "Three of a Kind" };
  if (freq[0] === 2 && freq[1] === 2) return { rank: 200 + ranks[0], name: "Two Pair" };
  if (freq[0] === 2) return { rank: 100 + ranks[0], name: "One Pair" };
  return { rank: ranks[0], name: "High Card" };
}

export function bestHand(holeCards: Card[], community: Card[]): { rank: number; name: string } {
  const all = [...holeCards, ...community];
  const combos = combinations(all, 5);
  let best = { rank: -1, name: "High Card" };
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (result.rank > best.rank) best = result;
  }
  return best;
}
