"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import Link from "next/link";
import { use } from "react";

export default function MatchScoringPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = use(params);
  const tournamentId = id as Id<"tournaments">;
  const matchIdTyped = matchId as Id<"matches">;

  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const matchScore = useQuery(api.scoring.getMatchScore, { matchId: matchIdTyped });
  const myOrg = useQuery(api.organizations.getMyOrganization);

  const startMatch = useMutation(api.scoring.startMatch);
  const addPoint = useMutation(api.scoring.addPoint);
  const undoPoint = useMutation(api.scoring.undoPoint);
  const endMatch = useMutation(api.scoring.endMatch);

  const canScore = myOrg?.membership.role === "owner" || myOrg?.membership.role === "admin" || myOrg?.membership.role === "scorer";

  if (matchScore === undefined || tournament === undefined) {
    return (
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (matchScore === null || tournament === null) {
    return (
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400">Match not found.</p>
        <Link href={`/tournaments/${tournamentId}`} className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to tournament
        </Link>
      </div>
    );
  }

  const home = matchScore.participants.find((p) => p.side === "home");
  const away = matchScore.participants.find((p) => p.side === "away");
  const homeLabel = home?.teamName || home?.players.join(", ") || "Home";
  const awayLabel = away?.teamName || away?.players.join(", ") || "Away";

  const formatLabel = matchScore.scoringFormat === "standard" ? "Standard (Best of 5)" : "AVP Beach (Best of 3)";
  const maxSets = matchScore.scoringFormat === "standard" ? 5 : 3;

  const handleStart = async () => {
    try {
      await startMatch({ matchId: matchIdTyped });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPoint = async (side: "home" | "away") => {
    try {
      await addPoint({ matchId: matchIdTyped, side });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUndo = async () => {
    try {
      await undoPoint({ matchId: matchIdTyped });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnd = async () => {
    if (confirm("Are you sure you want to end this match?")) {
      try {
        await endMatch({ matchId: matchIdTyped });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-2">
        <Link href={`/tournaments/${tournamentId}`} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          ← Back to {tournament.name}
        </Link>
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          {matchScore.name || "Match"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {formatLabel}
        </p>
      </div>

      {matchScore.status === "scheduled" && (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Match has not started yet
          </p>
          {canScore && matchScore.scoringFormat && (
            <button
              onClick={() => void handleStart()}
              className="bg-green-600 hover:bg-green-700 text-white text-lg font-semibold px-8 py-4 rounded-xl transition-all"
            >
              Start Match
            </button>
          )}
          {!matchScore.scoringFormat && (
            <p className="text-sm text-red-500">
              No scoring format set for this match
            </p>
          )}
        </div>
      )}

      {matchScore.status === "in_progress" && matchScore.score && (
        <>
          <div className="text-center mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Set {matchScore.score.currentSet} of {maxSets}
            </p>
          </div>

          <div className="flex justify-center items-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                {matchScore.score.setsWon.home}
              </div>
              <p className="text-xs text-slate-500">Sets</p>
            </div>
            <div className="text-slate-400">-</div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                {matchScore.score.setsWon.away}
              </div>
              <p className="text-xs text-slate-500">Sets</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 truncate">
                {homeLabel}
              </p>
              <div className="text-7xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                {matchScore.score.home}
              </div>
              {canScore && (
                <button
                  onClick={() => void handleAddPoint("home")}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xl font-semibold py-4 rounded-xl transition-all active:scale-95"
                >
                  + Point
                </button>
              )}
            </div>

            <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 truncate">
                {awayLabel}
              </p>
              <div className="text-7xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                {matchScore.score.away}
              </div>
              {canScore && (
                <button
                  onClick={() => void handleAddPoint("away")}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xl font-semibold py-4 rounded-xl transition-all active:scale-95"
                >
                  + Point
                </button>
              )}
            </div>
          </div>

          {matchScore.score.setHistory.length > 0 && (
            <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Set History
              </p>
              <div className="flex gap-3 flex-wrap">
                {matchScore.score.setHistory.map((set, idx) => (
                  <div key={idx} className="text-sm text-slate-600 dark:text-slate-400">
                    Set {idx + 1}: {set.home}-{set.away}
                  </div>
                ))}
              </div>
            </div>
          )}

          {canScore && (
            <div className="flex gap-4 justify-center">
              {matchScore.canUndo && (
                <button
                  onClick={() => void handleUndo()}
                  className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Undo Last Point
                </button>
              )}
              <button
                onClick={() => void handleEnd()}
                className="px-6 py-3 text-red-600 dark:text-red-400 hover:underline"
              >
                End Match Early
              </button>
            </div>
          )}
        </>
      )}

      {matchScore.status === "completed" && matchScore.score && (
        <div className="text-center py-8">
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Match Completed
          </p>
          <div className="flex justify-center items-center gap-8 mb-6">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">{homeLabel}</p>
              <div className="text-5xl font-bold text-slate-800 dark:text-slate-200">
                {matchScore.score.setsWon.home}
              </div>
            </div>
            <div className="text-2xl text-slate-400">-</div>
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">{awayLabel}</p>
              <div className="text-5xl font-bold text-slate-800 dark:text-slate-200">
                {matchScore.score.setsWon.away}
              </div>
            </div>
          </div>
          {matchScore.score.setHistory.length > 0 && (
            <div className="text-sm text-slate-500">
              {matchScore.score.setHistory.map((set, idx) => (
                <span key={idx}>
                  {idx > 0 && ", "}
                  {set.home}-{set.away}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
