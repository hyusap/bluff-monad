"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~~/components/ui/alert-dialog";

export type LastTournamentResult = {
  tournamentId: number;
  winnerName: string;
  winnerSeat: number | null;
  totalPot: number | null;
  handsPlayed: number | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: LastTournamentResult;
};

export function LastTournamentResultsModal({ open, onOpenChange, result }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#111111] border-[#2A2A2A] text-white">
        <AlertDialogHeader className="items-start text-left">
          <AlertDialogTitle>Last Tournament Finished</AlertDialogTitle>
          <AlertDialogDescription className="text-neutral-400">
            Tournament #{result.tournamentId} ended. You were moved to the newest live table.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Winner</span>
            <span className="font-semibold text-white">{result.winnerName}</span>
          </div>
          {result.winnerSeat !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Seat</span>
              <span className="text-neutral-300">{result.winnerSeat}</span>
            </div>
          )}
          {result.handsPlayed !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Hands played</span>
              <span className="text-neutral-300">{result.handsPlayed}</span>
            </div>
          )}
          {result.totalPot !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Winning stack</span>
              <span className="text-neutral-300">{result.totalPot.toLocaleString()}</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
