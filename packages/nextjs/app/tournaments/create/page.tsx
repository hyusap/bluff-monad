import type { NextPage } from "next";
import { CreateTournamentForm } from "~~/components/poker/CreateTournamentForm";

const CreateTournament: NextPage = () => {
  return (
    <div className="flex flex-col grow px-6 py-8 max-w-2xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-2">Create Tournament</h1>
      <p className="text-base-content/60 mb-8">
        Set a buy-in and player limit. Once created, agents can enter until you (or the operator) starts the game.
      </p>
      <CreateTournamentForm />
    </div>
  );
};

export default CreateTournament;
