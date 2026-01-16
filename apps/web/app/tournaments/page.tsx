"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import Link from "next/link";

export default function TournamentsPage() {
  const tournaments = useQuery(api.tournaments.listTournaments, {});
  const allTournaments = useQuery(api.tournaments.listTournaments, { includeArchived: true });
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const createTournament = useMutation(api.tournaments.createTournament);

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDescription, setTournamentDescription] = useState("");
  const [tournamentStatus, setTournamentStatus] = useState<"draft" | "active" | "completed">("draft");
  const [tournamentStartDate, setTournamentStartDate] = useState("");
  const [tournamentEndDate, setTournamentEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const canManage = myOrg?.membership.role === "owner" || myOrg?.membership.role === "admin";
  const archivedTournaments = allTournaments?.filter((t) => t.archived) ?? [];

  const parseDate = (value: string) =>
    value ? new Date(value).getTime() : undefined;

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = tournamentName.trim();
    if (!trimmedName) {
      setError("Tournament name is required.");
      return;
    }

    const startDate = parseDate(tournamentStartDate);
    const endDate = parseDate(tournamentEndDate);
    if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
      setError("Start date must be before end date.");
      return;
    }

    setIsCreating(true);
    try {
      await createTournament({
        name: trimmedName,
        description: tournamentDescription.trim() || undefined,
        status: tournamentStatus,
        startDate,
        endDate,
      });
      setTournamentName("");
      setTournamentDescription("");
      setTournamentStatus("draft");
      setTournamentStartDate("");
      setTournamentEndDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create tournament.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Tournaments
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your organization&apos;s tournaments
        </p>
      </div>

      {canManage && (
        <form
          className="mb-8 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
          onSubmit={handleCreate}
        >
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Create a tournament
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tournament name
              </label>
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                placeholder="Summer Spike Classic"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={tournamentStatus}
                onChange={(e) => setTournamentStatus(e.target.value as "draft" | "active" | "completed")}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description (optional)
            </label>
            <input
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
              placeholder="Open division volleyball tournament."
              value={tournamentDescription}
              onChange={(e) => setTournamentDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Start date (optional)
              </label>
              <input
                type="date"
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={tournamentStartDate}
                onChange={(e) => setTournamentStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                End date (optional)
              </label>
              <input
                type="date"
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                value={tournamentEndDate}
                onChange={(e) => setTournamentEndDate(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-all duration-200"
          >
            {isCreating ? "Creating..." : "Create tournament"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          All tournaments
        </h2>

        {tournaments === undefined ? (
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        ) : tournaments.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No tournaments yet.{canManage ? " Create one above." : ""}
          </p>
        ) : (
          <div className="grid gap-4">
            {tournaments.map((tournament) => (
              <Link
                key={tournament._id}
                href={`/tournaments/${tournament._id}`}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                      {tournament.name}
                    </h3>
                    {tournament.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {tournament.description}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={tournament.status} />
                </div>
                {(tournament.startDate || tournament.endDate) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {tournament.startDate && new Date(tournament.startDate).toLocaleDateString()}
                    {tournament.startDate && tournament.endDate && " - "}
                    {tournament.endDate && new Date(tournament.endDate).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Archived Section */}
      {archivedTournaments.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span>{showArchived ? "▼" : "▶"}</span>
            <span>Archived ({archivedTournaments.length})</span>
          </button>

          {showArchived && (
            <div className="grid gap-4 mt-4">
              {archivedTournaments.map((tournament) => (
                <Link
                  key={tournament._id}
                  href={`/tournaments/${tournament._id}`}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-500 transition-all opacity-75 hover:opacity-100"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                          {tournament.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                          Archived
                        </span>
                      </div>
                      {tournament.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                          {tournament.description}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={tournament.status} />
                  </div>
                  {(tournament.startDate || tournament.endDate) && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      {tournament.startDate && new Date(tournament.startDate).toLocaleDateString()}
                      {tournament.startDate && tournament.endDate && " - "}
                      {tournament.endDate && new Date(tournament.endDate).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
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
