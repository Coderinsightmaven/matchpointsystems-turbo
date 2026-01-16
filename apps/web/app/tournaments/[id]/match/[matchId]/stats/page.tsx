"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import Link from "next/link";
import { use } from "react";

const VOLLEYBALL_STATS = [
  { key: "kill", label: "Kills" },
  { key: "error", label: "Errors" },
  { key: "ace", label: "Aces" },
  { key: "service_error", label: "Svc Err" },
  { key: "dig", label: "Digs" },
  { key: "block", label: "Blocks" },
  { key: "assist", label: "Assists" },
] as const;

export default function MatchStatsPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = use(params);
  const tournamentId = id as Id<"tournaments">;
  const matchIdTyped = matchId as Id<"matches">;

  const statsSummary = useQuery(api.stats.getMatchStatsSummary, { matchId: matchIdTyped });
  const myOrg = useQuery(api.organizations.getMyOrganization);

  const updatePlayerStats = useMutation(api.stats.updatePlayerStats);

  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = myOrg?.membership.role === "owner" || myOrg?.membership.role === "admin";

  if (statsSummary === undefined) {
    return (
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (statsSummary === null) {
    return (
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400">Match not found.</p>
        <Link href={`/tournaments/${tournamentId}`} className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to tournament
        </Link>
      </div>
    );
  }

  const startEditing = (playerName: string, side: "home" | "away") => {
    const player = statsSummary.players.find((p) => p.playerName === playerName);
    const values: Record<string, number> = {};
    for (const stat of VOLLEYBALL_STATS) {
      values[stat.key] = player?.stats[stat.key] || 0;
    }
    setEditValues(values);
    setEditingPlayer(playerName);
  };

  const handleSave = async (playerName: string, side: "home" | "away") => {
    setIsSaving(true);
    try {
      await updatePlayerStats({
        matchId: matchIdTyped,
        playerName,
        side,
        stats: VOLLEYBALL_STATS.map((stat) => ({
          statType: stat.key,
          value: editValues[stat.key] || 0,
        })),
      });
      setEditingPlayer(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const allPlayers = [
    ...statsSummary.homePlayers.map((p) => ({ name: p, side: "home" as const })),
    ...statsSummary.awayPlayers.map((p) => ({ name: p, side: "away" as const })),
  ];

  // Add any players that have stats but aren't in the participant list
  for (const player of statsSummary.players) {
    if (!allPlayers.find((p) => p.name === player.playerName)) {
      allPlayers.push({ name: player.playerName, side: player.side });
    }
  }

  const getPlayerStats = (playerName: string): Record<string, number> => {
    const player = statsSummary.players.find((p) => p.playerName === playerName);
    return player?.stats || {};
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-2">
        <Link
          href={`/tournaments/${tournamentId}/match/${matchId}`}
          className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          ← Back to match
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Match Stats
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {statsSummary.matchName || "Match"}: {statsSummary.homeTeam} vs {statsSummary.awayTeam}
        </p>
      </div>

      {/* Team Totals */}
      <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Team Totals
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-400">Team</th>
                {VOLLEYBALL_STATS.map((stat) => (
                  <th key={stat.key} className="text-center py-2 px-2 font-medium text-slate-600 dark:text-slate-400">
                    {stat.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">
                  {statsSummary.homeTeam}
                </td>
                {VOLLEYBALL_STATS.map((stat) => (
                  <td key={stat.key} className="text-center py-2 px-2 text-slate-600 dark:text-slate-400">
                    {statsSummary.teamTotals.home[stat.key] || 0}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">
                  {statsSummary.awayTeam}
                </td>
                {VOLLEYBALL_STATS.map((stat) => (
                  <td key={stat.key} className="text-center py-2 px-2 text-slate-600 dark:text-slate-400">
                    {statsSummary.teamTotals.away[stat.key] || 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Stats */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Player Stats {canEdit && <span className="text-xs text-slate-400 font-normal">(click to edit)</span>}
        </h2>

        {allPlayers.length === 0 ? (
          <p className="text-slate-500">No players in this match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-400">Player</th>
                  <th className="text-left py-2 px-2 font-medium text-slate-600 dark:text-slate-400">Team</th>
                  {VOLLEYBALL_STATS.map((stat) => (
                    <th key={stat.key} className="text-center py-2 px-2 font-medium text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </th>
                  ))}
                  {canEdit && <th className="py-2 px-2"></th>}
                </tr>
              </thead>
              <tbody>
                {allPlayers.map((player) => {
                  const stats = getPlayerStats(player.name);
                  const isEditing = editingPlayer === player.name;

                  return (
                    <tr
                      key={player.name}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">
                        {player.name}
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-500">
                        {player.side === "home" ? statsSummary.homeTeam : statsSummary.awayTeam}
                      </td>
                      {VOLLEYBALL_STATS.map((stat) => (
                        <td key={stat.key} className="text-center py-2 px-2">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editValues[stat.key] || 0}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  [stat.key]: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-12 text-center rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                            />
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400">
                              {stats[stat.key] || 0}
                            </span>
                          )}
                        </td>
                      ))}
                      {canEdit && (
                        <td className="py-2 px-2 text-right">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => void handleSave(player.name, player.side)}
                                disabled={isSaving}
                                className="text-xs text-green-600 hover:underline"
                              >
                                {isSaving ? "..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingPlayer(null)}
                                className="text-xs text-slate-500 hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(player.name, player.side)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
