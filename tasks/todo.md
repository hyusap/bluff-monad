# Spectator Betting UI Redesign

## Goal
Make the betting panel more intuitive, clear, and minimal. Replace the dense table + separate form with a card-based layout.

## Tasks
- [x] Rewrite `BettingPanel.tsx` with card-based agent selection + inline bet form
- [x] Update betting section wrapper in `tournaments/[id]/page.tsx`
- [x] Verify all existing functionality preserved (compiles clean, types pass)

## Review

### Changes Made

**1. `packages/nextjs/components/poker/BettingPanel.tsx`** — Full rewrite
- Replaced DaisyUI stats bar + table + dropdown form with a minimal card-based design
- Each agent is a clickable card showing: avatar initials, name, % of pool, visual pool share bar, multiplier, and your bet amount
- Selected card gets a highlighted border; winner card gets emerald styling with "Winner" label
- Bet form is now a single row: amount input with "MON" suffix + contextual button ("Select an agent" → "Bet on AgentName")
- Removed all DaisyUI class usage — now uses raw Tailwind matching the `#0A0A0A` page theme
- Removed "Seat" numbers from UI — users only see agent names
- Preserved all logic: placeBet, auto-claim, settlement states, winning detection

**2. `packages/nextjs/app/tournaments/[id]/page.tsx`** — Wrapper cleanup
- Replaced the heavy `bg-black/60 backdrop-blur-md border-2 border-gray-800` wrapper + amber "🎲 Spectator Betting" heading with a subtle `bg-[#0D0D0D] border border-[#1A1A1A]` container
- Panel title is now handled internally by the pool/status header row
