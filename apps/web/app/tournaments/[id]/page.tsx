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
  const [division, setDivision] = useState<"mens" | "womens" | "mixed">("mens");
  const [scoringFormat, setScoringFormat] = useState<"standard" | "avp_beach">("avp_beach");
  const [matchName, setMatchName] = useState("");
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [homeSelectedPlayers, setHomeSelectedPlayers] = useState<string[]>([]);
  const [awaySelectedPlayers, setAwaySelectedPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const canManage = myOrg?.membership.role === "owner" || myOrg?.membership.role === "admin";
  const teamNames = myOrg?.organization.teamNames ?? [];
  const playerNames = myOrg?.organization.playerNames ?? [];

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

  const toggleHomePlayer = (name: string) => {
    if (homeSelectedPlayers.includes(name)) {
      setHomeSelectedPlayers(homeSelectedPlayers.filter((p) => p !== name));
    } else if (format === "teams" || homeSelectedPlayers.length < requiredPlayers) {
      setHomeSelectedPlayers([...homeSelectedPlayers, name]);
    }
  };

  const toggleAwayPlayer = (name: string) => {
    if (awaySelectedPlayers.includes(name)) {
      setAwaySelectedPlayers(awaySelectedPlayers.filter((p) => p !== name));
    } else if (format === "teams" || awaySelectedPlayers.length < requiredPlayers) {
      setAwaySelectedPlayers([...awaySelectedPlayers, name]);
    }
  };

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

    const homeParticipant = {
      side: "home" as const,
      players: homeSelectedPlayers,
      ...(format === "teams" ? { teamName: homeTeamName.trim() } : {}),
    };
    const awayParticipant = {
      side: "away" as const,
      players: awaySelectedPlayers,
      ...(format === "teams" ? { teamName: awayTeamName.trim() } : {}),
    };

    if (format === "teams") {
      if (!homeParticipant.teamName || !awayParticipant.teamName) {
        setError("Team names are required for team matches.");
        return;
      }
    } else {
      if (homeSelectedPlayers.length !== requiredPlayers || awaySelectedPlayers.length !== requiredPlayers) {
        setError(`${format} format requires ${requiredPlayers} player(s) per side.`);
        return;
      }
    }

    setIsCreating(true);
    try {
      await createMatch({
        format,
        division,
        participants: [homeParticipant, awayParticipant],
        tournamentId,
        scoringFormat,
        ...(matchName.trim() ? { name: matchName.trim() } : {}),
      });
      setMatchName("");
      setHomeTeamName("");
      setAwayTeamName("");
      setHomeSelectedPlayers([]);
      setAwaySelectedPlayers([]);
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
              Match Format
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

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Division
            </label>
            <div className="flex gap-2">
              {([
                { value: "mens", label: "Men's" },
                { value: "womens", label: "Women's" },
                { value: "mixed", label: "Mixed" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    division === opt.value
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                  }`}
                  onClick={() => setDivision(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Scoring Format
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  scoringFormat === "avp_beach"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                }`}
                onClick={() => setScoringFormat("avp_beach")}
              >
                AVP Beach (Best of 3)
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  scoringFormat === "standard"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                }`}
                onClick={() => setScoringFormat("standard")}
              >
                Standard (Best of 5)
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {scoringFormat === "avp_beach"
                ? "Sets to 21, tiebreaker to 15, win by 2"
                : "Sets to 25, tiebreaker to 15, win by 2"}
            </p>
          </div>

          {format === "teams" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Home team
                </label>
                {teamNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teamNames.map((team) => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => setHomeTeamName(homeTeamName === team ? "" : team)}
                        disabled={awayTeamName === team}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          homeTeamName === team
                            ? "bg-slate-800 text-white border-slate-800"
                            : awayTeamName === team
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No teams in roster. Add teams on the Roster page.</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Away team
                </label>
                {teamNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teamNames.map((team) => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => setAwayTeamName(awayTeamName === team ? "" : team)}
                        disabled={homeTeamName === team}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          awayTeamName === team
                            ? "bg-slate-800 text-white border-slate-800"
                            : homeTeamName === team
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No teams in roster. Add teams on the Roster page.</p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Home players {format !== "teams" && `(${homeSelectedPlayers.length}/${requiredPlayers})`}
              </label>
              {playerNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {playerNames.map((player) => {
                    const isHomeSelected = homeSelectedPlayers.includes(player);
                    const isAwaySelected = awaySelectedPlayers.includes(player);
                    const canSelectMore = format === "teams" || homeSelectedPlayers.length < requiredPlayers;
                    
                    return (
                      <button
                        key={player}
                        type="button"
                        onClick={() => toggleHomePlayer(player)}
                        disabled={isAwaySelected || (!isHomeSelected && !canSelectMore)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          isHomeSelected
                            ? "bg-slate-800 text-white border-slate-800"
                            : isAwaySelected
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : !canSelectMore
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {player}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No players in roster. Add players on the Roster page.</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Away players {format !== "teams" && `(${awaySelectedPlayers.length}/${requiredPlayers})`}
              </label>
              {playerNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {playerNames.map((player) => {
                    const isAwaySelected = awaySelectedPlayers.includes(player);
                    const isHomeSelected = homeSelectedPlayers.includes(player);
                    const canSelectMore = format === "teams" || awaySelectedPlayers.length < requiredPlayers;
                    
                    return (
                      <button
                        key={player}
                        type="button"
                        onClick={() => toggleAwayPlayer(player)}
                        disabled={isHomeSelected || (!isAwaySelected && !canSelectMore)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          isAwaySelected
                            ? "bg-slate-800 text-white border-slate-800"
                            : isHomeSelected
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : !canSelectMore
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {player}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No players in roster. Add players on the Roster page.</p>
              )}
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
              const divisionLabel = match.division
                ? match.division === "mens" ? "Men's" : match.division === "womens" ? "Women's" : "Mixed"
                : null;
              const hasScoring = !!match.scoringFormat;
              const isLive = match.status === "in_progress";
              const isCompleted = match.status === "completed";

              const scoreDisplay = match.score
                ? `${match.score.setsWon.home}-${match.score.setsWon.away}`
                : null;
              const currentSetScore = match.score && match.status === "in_progress"
                ? `(${match.score.home}-${match.score.away})`
                : null;

              return (
                <Link
                  key={match._id}
                  href={hasScoring ? `/tournaments/${tournamentId}/match/${match._id}` : "#"}
                  className={`block p-4 rounded-xl border transition-colors ${
                    hasScoring
                      ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-default"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {match.name || "Volleyball Match"}
                        </p>
                        {isLive && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500 text-white">
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {homeLabel} vs {awayLabel}
                      </p>
                      {scoreDisplay && (
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-2">
                          {scoreDisplay} {currentSetScore}
                        </p>
                      )}
                      {match.score?.setHistory && match.score.setHistory.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          {match.score.setHistory.map((s, i) => `${s.home}-${s.away}`).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {divisionLabel && `${divisionLabel} `}{formatLabel}
                      </p>
                      {!isLive && (
                        <p className="text-xs text-slate-500">
                          {isCompleted ? "Completed" : match.status}
                        </p>
                      )}
                      {hasScoring && !isCompleted && !isLive && (
                        <p className="text-xs text-blue-600 mt-1">Score match →</p>
                      )}
                    </div>
                  </div>
                </Link>
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
