"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tournamentId = id as Id<"tournaments">;
  const router = useRouter();

  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const matches = useQuery(api.matches.listMatchesByTournament, { tournamentId });
  const myOrg = useQuery(api.organizations.getMyOrganization);

  const updateTournament = useMutation(api.tournaments.updateTournament);
  const archiveTournament = useMutation(api.tournaments.archiveTournament);
  const createMatch = useMutation(api.matches.createMatch);

  const [format, setFormat] = useState<"singles" | "doubles" | "teams">("singles");
  const [matchName, setMatchName] = useState("");
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [homePlayers, setHomePlayers] = useState("");
  const [awayPlayers, setAwayPlayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const canManage = myOrg?.membership.role === "owner" || myOrg?.membership.role === "admin";

  if (tournament === undefined) {
    return (
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (tournament === null) {
    return (
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400">Tournament not found.</p>
        <Link href="/tournaments" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to tournaments
        </Link>
      </div>
    );
  }

  const requiredPlayers = format === "singles" ? 1 : format === "doubles" ? 2 : 0;

  const parsePlayers = (value: string) =>
    value.split(",").map((p) => p.trim()).filter(Boolean);

  const handleStatusUpdate = async (status: "draft" | "active" | "completed") => {
    try {
      await updateTournament({ tournamentId, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleArchive = async () => {
    try {
      await archiveTournament({ tournamentId });
      router.push("/tournaments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
    }
  };

  const handleCreateMatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const homePlayersList = parsePlayers(homePlayers);
    const awayPlayersList = parsePlayers(awayPlayers);

    const homeParticipant = {
      side: "home" as const,
      players: homePlayersList,
      ...(format === "teams" ? { teamName: homeTeamName.trim() } : {}),
    };
    const awayParticipant = {
      side: "away" as const,
      players: awayPlayersList,
      ...(format === "teams" ? { teamName: awayTeamName.trim() } : {}),
    };

    if (format === "teams") {
      if (!homeParticipant.teamName || !awayParticipant.teamName) {
        setError("Team names are required for team matches.");
        return;
      }
    } else {
      if (homePlayersList.length !== requiredPlayers || awayPlayersList.length !== requiredPlayers) {
        setError(`${format} format requires ${requiredPlayers} player(s) per side.`);
        return;
      }
    }

    setIsCreating(true);
    try {
      await createMatch({
        format,
        participants: [homeParticipant, awayParticipant],
        tournamentId,
        ...(matchName.trim() ? { name: matchName.trim() } : {}),
      });
      setMatchName("");
      setHomeTeamName("");
      setAwayTeamName("");
      setHomePlayers("");
      setAwayPlayers("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create match");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href="/tournaments" className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          ← Back to tournaments
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
              {tournament.name}
            </h1>
            {tournament.description && (
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                {tournament.description}
              </p>
            )}
          </div>
          <StatusBadge status={tournament.status} />
        </div>
        {(tournament.startDate || tournament.endDate) && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {tournament.startDate && new Date(tournament.startDate).toLocaleDateString()}
            {tournament.startDate && tournament.endDate && " - "}
            {tournament.endDate && new Date(tournament.endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {canManage && (
        <div className="mb-8 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Tournament Status
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {(["draft", "active", "completed"] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tournament.status === status
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                }`}
                onClick={() => void handleStatusUpdate(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void handleArchive()}
              className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Archive
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {canManage && (
        <form
          className="mb-8 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
          onSubmit={handleCreateMatch}
        >
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Create a match
          </h2>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Match name (optional)
            </label>
            <input
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
              placeholder="Friday Night Volleyball"
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Format
            </label>
            <div className="flex gap-2">
              {(["singles", "doubles", "teams"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    format === opt
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                  }`}
                  onClick={() => setFormat(opt)}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            {format !== "teams" && (
              <p className="text-xs text-slate-500">
                Enter exactly {requiredPlayers} player(s) per side.
              </p>
            )}
          </div>

          {format === "teams" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Home team name
                </label>
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                  placeholder="Home team"
                  value={homeTeamName}
                  onChange={(e) => setHomeTeamName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Away team name
                </label>
                <input
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                  placeholder="Away team"
                  value={awayTeamName}
                  onChange={(e) => setAwayTeamName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Home players
              </label>
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                placeholder="Comma-separated names"
                value={homePlayers}
                onChange={(e) => setHomePlayers(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Away players
              </label>
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                placeholder="Comma-separated names"
                value={awayPlayers}
                onChange={(e) => setAwayPlayers(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-all duration-200"
          >
            {isCreating ? "Creating..." : "Create match"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Matches
        </h2>

        {matches === undefined ? (
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        ) : matches.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No matches yet.{canManage ? " Create one above." : ""}
          </p>
        ) : (
          <div className="grid gap-4">
            {matches.map((match) => {
              const home = match.participants.find((p) => p.side === "home");
              const away = match.participants.find((p) => p.side === "away");
              const homeLabel = home?.teamName || home?.players.join(", ") || "Home";
              const awayLabel = away?.teamName || away?.players.join(", ") || "Away";
              const formatLabel = match.format.charAt(0).toUpperCase() + match.format.slice(1);

              return (
                <div
                  key={match._id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {match.name || "Volleyball Match"}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {homeLabel} vs {awayLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{formatLabel}</p>
                      <p className="text-xs text-slate-500">{match.status}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "active" | "completed" }) {
  const colors = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
