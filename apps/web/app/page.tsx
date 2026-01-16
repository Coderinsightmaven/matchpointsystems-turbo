"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md p-4 border-b border-slate-200 dark:border-slate-700 flex flex-row justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <Image src="/convex.svg" alt="Convex Logo" width={32} height={32} />
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
            <Image
              src="/nextjs-icon-light-background.svg"
              alt="Next.js Logo"
              width={32}
              height={32}
              className="dark:hidden"
            />
            <Image
              src="/nextjs-icon-dark-background.svg"
              alt="Next.js Logo"
              width={32}
              height={32}
              className="hidden dark:block"
            />
          </div>
          <h1 className="font-semibold text-slate-800 dark:text-slate-200">
            Convex + Next.js + Convex Auth
          </h1>
        </div>
        <SignOutButton />
      </header>
      <main className="p-8 flex flex-col gap-8">
        <Content />
      </main>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const adminAccess = useQuery(
    api.adminAccess.checkAdminAccess,
    isAuthenticated ? {} : "skip"
  );

  return (
    <>
      {isAuthenticated && (
        <div className="flex items-center gap-3">
          {adminAccess?.isAdmin && (
            <Link
              href="/admin"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium transition-colors"
            >
              Admin Panel
            </Link>
          )}
          <button
            className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            onClick={() =>
              void signOut().then(() => {
                router.push("/signin");
              })
            }
          >
            Sign out
          </button>
        </div>
      )}
    </>
  );
}

function Content() {
  const matches = useQuery(api.matches.listMatches);
  const createMatch = useMutation(api.matches.createMatch);

  const [format, setFormat] = useState<"singles" | "doubles" | "teams">(
    "singles",
  );
  const [name, setName] = useState("");
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [homePlayers, setHomePlayers] = useState("");
  const [awayPlayers, setAwayPlayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiredPlayers =
    format === "singles" ? 1 : format === "doubles" ? 2 : 0;

  const parsePlayers = (value: string) =>
    value
      .split(",")
      .map((player) => player.trim())
      .filter(Boolean);

  const buildParticipants = () => {
    const homePlayersList = parsePlayers(homePlayers);
    const awayPlayersList = parsePlayers(awayPlayers);

    const homeParticipant = {
      side: "home" as const,
      players: homePlayersList,
      ...(format === "teams"
        ? { teamName: homeTeamName.trim() }
        : {}),
    };
    const awayParticipant = {
      side: "away" as const,
      players: awayPlayersList,
      ...(format === "teams"
        ? { teamName: awayTeamName.trim() }
        : {}),
    };

    return { homeParticipant, awayParticipant };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const { homeParticipant, awayParticipant } = buildParticipants();

    if (format === "teams") {
      if (!homeParticipant.teamName || !awayParticipant.teamName) {
        setError("Team names are required for team matches.");
        return;
      }
    } else {
      if (
        homeParticipant.players.length !== requiredPlayers ||
        awayParticipant.players.length !== requiredPlayers
      ) {
        setError(
          `${format} format requires ${requiredPlayers} player(s) per side.`,
        );
        return;
      }
    }

    const trimmedName = name.trim();
    const payload = {
      format,
      participants: [homeParticipant, awayParticipant],
      ...(trimmedName ? { name: trimmedName } : {}),
    };

    setIsSubmitting(true);
    try {
      await createMatch(payload);
      setName("");
      setHomeTeamName("");
      setAwayTeamName("");
      setHomePlayers("");
      setAwayPlayers("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create match.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div>
        <h2 className="font-bold text-2xl text-slate-800 dark:text-slate-200">
          Volleyball Match Builder
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Create singles, doubles, or team matches and track them in Convex.
        </p>
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

      <form
        className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Match name (optional)
          </label>
          <input
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            placeholder="Friday Night Volleyball"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Format
          </label>
          <div className="flex gap-3">
            {(["singles", "doubles", "teams"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  format === option
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                }`}
                onClick={() => setFormat(option)}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          {format !== "teams" && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
                onChange={(event) => setHomeTeamName(event.target.value)}
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
                onChange={(event) => setAwayTeamName(event.target.value)}
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
              onChange={(event) => setHomePlayers(event.target.value)}
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
              onChange={(event) => setAwayPlayers(event.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] disabled:scale-100"
        >
          {isSubmitting ? "Creating match..." : "Create match"}
        </button>
      </form>

      <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Recent matches
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {matches ? `${matches.length} total` : "Loading..."}
          </span>
        </div>
        {matches === undefined ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading matches...
          </p>
        ) : matches.length ? (
          <div className="grid gap-4">
            {matches.map((match) => {
              const home = match.participants.find(
                (participant) => participant.side === "home",
              );
              const away = match.participants.find(
                (participant) => participant.side === "away",
              );

              const formatLabel =
                match.format.charAt(0).toUpperCase() + match.format.slice(1);
              const homeLabel =
                home?.teamName || home?.players.join(", ") || "Home";
              const awayLabel =
                away?.teamName || away?.players.join(", ") || "Away";

              return (
                <div
                  key={match._id}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {match.name || "Volleyball Match"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatLabel} · {match.status}
                    </p>
                  </div>
                  <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                    {homeLabel} <span className="mx-2">vs</span> {awayLabel}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No matches yet. Create the first one above.
          </p>
        )}
      </div>
    </div>
  );
}
