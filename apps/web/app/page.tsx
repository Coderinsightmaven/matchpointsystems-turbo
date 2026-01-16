"use client";

import { useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
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
            Tournament Management
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
  const myOrg = useQuery(api.organizations.getMyOrganization);

  if (myOrg === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (myOrg === null) {
    return <CreateOrganizationForm />;
  }

  return <OrganizationDashboard org={myOrg} />;
}

function CreateOrganizationForm() {
  const createOrganization = useMutation(api.organizations.createOrganization);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Organization name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createOrganization({
        name: trimmedName,
        description: description.trim() || undefined,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create organization."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      <div className="text-center">
        <h2 className="font-bold text-2xl text-slate-800 dark:text-slate-200">
          Welcome to Tournament Management
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Create your organization to start managing tournaments and matches.
        </p>
      </div>

      <form
        className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Create your organization
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Organization name
          </label>
          <input
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            placeholder="AVP League"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Description (optional)
          </label>
          <input
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            placeholder="Professional volleyball tournament organization"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] disabled:scale-100"
        >
          {isSubmitting ? "Creating organization..." : "Create organization"}
        </button>
      </form>
    </div>
  );
}

type OrgData = {
  organization: {
    _id: Id<"organizations">;
    _creationTime: number;
    name: string;
    description?: string;
    createdBy: Id<"users">;
    teamNames?: string[];
    playerNames?: string[];
  };
  membership: {
    _id: Id<"organizationMembers">;
    _creationTime: number;
    organizationId: Id<"organizations">;
    userId: Id<"users">;
    role: "owner" | "admin" | "scorer";
  };
};

function OrganizationDashboard({ org }: { org: OrgData }) {
  const [showMembers, setShowMembers] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const canManage = org.membership.role === "owner" || org.membership.role === "admin";

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-2xl text-slate-800 dark:text-slate-200">
            {org.organization.name}
          </h2>
          {org.organization.description && (
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {org.organization.description}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Your role: <span className="font-semibold">{org.membership.role}</span>
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowRoster(!showRoster)}
              className="px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {showRoster ? "Hide roster" : "Manage roster"}
            </button>
            <button
              type="button"
              onClick={() => setShowMembers(!showMembers)}
              className="px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {showMembers ? "Hide members" : "Manage members"}
            </button>
          </div>
        )}
      </div>

      {showRoster && canManage && (
        <RosterManagement organizationId={org.organization._id} />
      )}

      {showMembers && canManage && (
        <MemberManagement organizationId={org.organization._id} currentRole={org.membership.role} />
      )}

      <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

      <TournamentSection canManage={canManage} />
    </div>
  );
}

function RosterManagement({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const roster = useQuery(api.organizations.getRoster, { organizationId });
  const addTeamName = useMutation(api.organizations.addTeamName);
  const removeTeamName = useMutation(api.organizations.removeTeamName);
  const addPlayerName = useMutation(api.organizations.addPlayerName);
  const removePlayerName = useMutation(api.organizations.removePlayerName);

  const [newTeamName, setNewTeamName] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Organization Roster
      </h3>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Team Names
          </h4>
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
              className="px-3 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {roster?.teamNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                {name}
                <button
                  type="button"
                  onClick={() => void handleRemoveTeam(name)}
                  className="text-red-500 hover:text-red-700"
                >
                  x
                </button>
              </span>
            ))}
            {roster?.teamNames.length === 0 && (
              <p className="text-xs text-slate-500">No teams yet</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Player Names
          </h4>
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
              className="px-3 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {roster?.playerNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                {name}
                <button
                  type="button"
                  onClick={() => void handleRemovePlayer(name)}
                  className="text-red-500 hover:text-red-700"
                >
                  x
                </button>
              </span>
            ))}
            {roster?.playerNames.length === 0 && (
              <p className="text-xs text-slate-500">No players yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberManagement({
  organizationId,
  currentRole,
}: {
  organizationId: Id<"organizations">;
  currentRole: "owner" | "admin" | "scorer";
}) {
  const members = useQuery(api.organizations.listMembers, { organizationId });
  const updateMemberRole = useMutation(api.organizations.updateMemberRole);
  const removeMember = useMutation(api.organizations.removeMember);
  const inviteMember = useMutation(api.organizations.inviteMember);
  const [error, setError] = useState<string | null>(null);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "scorer">("scorer");
  const [isInviting, setIsInviting] = useState(false);

  const isOwner = currentRole === "owner";

  const handleRoleChange = async (
    memberId: Id<"organizationMembers">,
    role: "owner" | "admin" | "scorer"
  ) => {
    setError(null);
    try {
      await updateMemberRole({ memberId, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleRemove = async (memberId: Id<"organizationMembers">) => {
    setError(null);
    try {
      await removeMember({ memberId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleInvite = async () => {
    if (!inviteUserId.trim()) return;
    setError(null);
    setIsInviting(true);
    try {
      await inviteMember({
        organizationId,
        userId: inviteUserId.trim() as Id<"users">,
        role: inviteRole,
      });
      setInviteUserId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Organization Members
      </h3>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Invite a member
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            placeholder="User ID"
            value={inviteUserId}
            onChange={(e) => setInviteUserId(e.target.value)}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "admin" | "scorer")}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="admin">Admin</option>
            <option value="scorer">Scorer</option>
          </select>
          <button
            type="button"
            onClick={() => void handleInvite()}
            disabled={isInviting}
            className="px-3 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:bg-slate-500"
          >
            {isInviting ? "..." : "Invite"}
          </button>
        </div>
      </div>

      {members === undefined ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">No members found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {member.email ?? "Unknown user"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {member.role}
                </p>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      void handleRoleChange(
                        member._id,
                        e.target.value as "owner" | "admin" | "scorer"
                      )
                    }
                    className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="scorer">Scorer</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleRemove(member._id)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentSection({ canManage }: { canManage: boolean }) {
  const tournaments = useQuery(api.tournaments.listTournaments, {});
  const createTournament = useMutation(api.tournaments.createTournament);
  const updateTournament = useMutation(api.tournaments.updateTournament);
  const archiveTournament = useMutation(api.tournaments.archiveTournament);
  const createMatch = useMutation(api.matches.createMatch);

  const [selectedTournamentId, setSelectedTournamentId] = useState<
    Id<"tournaments"> | null
  >(null);
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDescription, setTournamentDescription] = useState("");
  const [tournamentStatus, setTournamentStatus] = useState<
    "draft" | "active" | "completed"
  >("draft");
  const [tournamentStartDate, setTournamentStartDate] = useState("");
  const [tournamentEndDate, setTournamentEndDate] = useState("");
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);

  const [format, setFormat] = useState<"singles" | "doubles" | "teams">(
    "singles"
  );
  const [name, setName] = useState("");
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [homePlayers, setHomePlayers] = useState("");
  const [awayPlayers, setAwayPlayers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchesByTournament = useQuery(
    api.matches.listMatchesByTournament,
    selectedTournamentId ? { tournamentId: selectedTournamentId } : "skip"
  );

  const visibleMatches = selectedTournamentId ? matchesByTournament : undefined;

  const selectedTournament = tournaments?.find(
    (tournament) => tournament._id === selectedTournamentId
  );

  const tournamentNameById = useMemo(() => {
    const entries =
      tournaments?.map((tournament) => [tournament._id, tournament.name]) ?? [];
    return new Map(entries);
  }, [tournaments]);

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
      ...(format === "teams" ? { teamName: homeTeamName.trim() } : {}),
    };
    const awayParticipant = {
      side: "away" as const,
      players: awayPlayersList,
      ...(format === "teams" ? { teamName: awayTeamName.trim() } : {}),
    };

    return { homeParticipant, awayParticipant };
  };

  const parseDate = (value: string) =>
    value ? new Date(value).getTime() : undefined;

  const handleCreateTournament = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setTournamentError(null);

    const trimmedName = tournamentName.trim();
    if (!trimmedName) {
      setTournamentError("Tournament name is required.");
      return;
    }

    const startDate = parseDate(tournamentStartDate);
    const endDate = parseDate(tournamentEndDate);
    if (
      startDate !== undefined &&
      endDate !== undefined &&
      startDate > endDate
    ) {
      setTournamentError("Start date must be before end date.");
      return;
    }

    setIsCreatingTournament(true);
    try {
      const id = await createTournament({
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
      setSelectedTournamentId(id);
    } catch (submitError) {
      setTournamentError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create tournament."
      );
    } finally {
      setIsCreatingTournament(false);
    }
  };

  const handleStatusUpdate = async (
    status: "draft" | "active" | "completed"
  ) => {
    if (!selectedTournamentId) {
      return;
    }
    try {
      await updateTournament({ tournamentId: selectedTournamentId, status });
    } catch (submitError) {
      setTournamentError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update tournament."
      );
    }
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
          `${format} format requires ${requiredPlayers} player(s) per side.`
        );
        return;
      }
    }

    if (!selectedTournamentId) {
      setError("Please select a tournament first.");
      return;
    }

    const trimmedName = name.trim();
    const payload = {
      format,
      participants: [homeParticipant, awayParticipant],
      tournamentId: selectedTournamentId,
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
          : "Unable to create match."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {canManage && (
        <>
          <form
            className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm"
            onSubmit={handleCreateTournament}
          >
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Create a tournament
            </h3>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tournament name
              </label>
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                placeholder="Summer Spike Classic"
                value={tournamentName}
                onChange={(event) => setTournamentName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Description (optional)
              </label>
              <input
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                placeholder="Open division volleyball tournament."
                value={tournamentDescription}
                onChange={(event) =>
                  setTournamentDescription(event.target.value)
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <select
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                  value={tournamentStatus}
                  onChange={(event) =>
                    setTournamentStatus(
                      event.target.value as "draft" | "active" | "completed"
                    )
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Start date (optional)
                </label>
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                  value={tournamentStartDate}
                  onChange={(event) =>
                    setTournamentStartDate(event.target.value)
                  }
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
                  onChange={(event) => setTournamentEndDate(event.target.value)}
                />
              </div>
            </div>
            {tournamentError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {tournamentError}
              </p>
            )}
            <button
              type="submit"
              disabled={isCreatingTournament}
              className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] disabled:scale-100"
            >
              {isCreatingTournament
                ? "Creating tournament..."
                : "Create tournament"}
            </button>
          </form>

          <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
        </>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Select a tournament
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tournaments ? `${tournaments.length} total` : "Loading..."}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {tournaments?.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              No tournaments yet. Create one above.
            </p>
          )}
          {tournaments?.map((tournament) => (
            <button
              key={tournament._id}
              type="button"
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedTournamentId === tournament._id
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
              }`}
              onClick={() => setSelectedTournamentId(tournament._id)}
            >
              {tournament.name}
            </button>
          ))}
        </div>
        {selectedTournament && canManage && (
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Current status:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedTournament.status}
              </span>
            </p>
            <div className="flex gap-2">
              {(["draft", "active", "completed"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    selectedTournament.status === status
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                  }`}
                  onClick={() => void handleStatusUpdate(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  void archiveTournament({ tournamentId: selectedTournament._id });
                  setSelectedTournamentId(null);
                }}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Archive tournament
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

      {canManage && selectedTournamentId && (
        <>
          <form
            className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Create a match in {selectedTournament?.name}
            </h3>
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
        </>
      )}

      {canManage && !selectedTournamentId && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          Select a tournament above to create matches.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Recent matches
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {visibleMatches ? `${visibleMatches.length} total` : "Loading..."}
          </span>
        </div>
        {visibleMatches === undefined ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading matches...
          </p>
        ) : visibleMatches.length ? (
          <div className="grid gap-4">
            {visibleMatches.map((match) => {
              const home = match.participants.find(
                (participant) => participant.side === "home"
              );
              const away = match.participants.find(
                (participant) => participant.side === "away"
              );

              const formatLabel =
                match.format.charAt(0).toUpperCase() + match.format.slice(1);
              const homeLabel =
                home?.teamName || home?.players.join(", ") || "Home";
              const awayLabel =
                away?.teamName || away?.players.join(", ") || "Away";

              const tournamentLabel = tournamentNameById.get(match.tournamentId) ?? "Tournament";

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
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tournamentLabel}
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
            No matches yet.{canManage ? " Create the first one above." : ""}
          </p>
        )}
      </div>
    </>
  );
}
