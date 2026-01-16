"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { useRouter } from "next/navigation";

export default function RosterPage() {
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const roster = useQuery(
    api.organizations.getRoster,
    myOrg ? { organizationId: myOrg.organization._id } : "skip"
  );
  const addTeamName = useMutation(api.organizations.addTeamName);
  const removeTeamName = useMutation(api.organizations.removeTeamName);
  const addPlayerName = useMutation(api.organizations.addPlayerName);
  const removePlayerName = useMutation(api.organizations.removePlayerName);

  const router = useRouter();
  const [newTeamName, setNewTeamName] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canManage = myOrg?.membership.role === "owner" || myOrg?.membership.role === "admin";

  // Redirect if not authorized
  if (myOrg !== undefined && !canManage) {
    router.push("/");
    return null;
  }

  if (myOrg === undefined) {
    return (
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  const organizationId = myOrg.organization._id;

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    setError(null);
    try {
      await addTeamName({ organizationId, name: newTeamName.trim() });
      setNewTeamName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add team");
    }
  };

  const handleRemoveTeam = async (name: string) => {
    setError(null);
    try {
      await removeTeamName({ organizationId, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove team");
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    setError(null);
    try {
      await addPlayerName({ organizationId, name: newPlayerName.trim() });
      setNewPlayerName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player");
    }
  };

  const handleRemovePlayer = async (name: string) => {
    setError(null);
    try {
      await removePlayerName({ organizationId, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove player");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Roster
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your organization&apos;s teams and players
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Team Names
          </h2>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
              placeholder="Add team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleAddTeam()}
            />
            <button
              type="button"
              onClick={() => void handleAddTeam()}
              className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {roster?.teamNames.length === 0 && (
              <p className="text-sm text-slate-500">No teams yet</p>
            )}
            {roster?.teamNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                {name}
                <button
                  type="button"
                  onClick={() => void handleRemoveTeam(name)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Player Names
          </h2>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
              placeholder="Add player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleAddPlayer()}
            />
            <button
              type="button"
              onClick={() => void handleAddPlayer()}
              className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {roster?.playerNames.length === 0 && (
              <p className="text-sm text-slate-500">No players yet</p>
            )}
            {roster?.playerNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                {name}
                <button
                  type="button"
                  onClick={() => void handleRemovePlayer(name)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
