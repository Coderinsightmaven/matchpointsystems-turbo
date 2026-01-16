"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();

  if (!isAuthenticated) {
    return <RedirectToSignIn />;
  }

  return <Content />;
}

function RedirectToSignIn() {
  const router = useRouter();
  router.push("/signin");
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-600 dark:text-slate-400">Redirecting...</p>
    </div>
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

  return <Dashboard org={myOrg} />;
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
    <div className="flex flex-col gap-6 max-w-xl mx-auto p-8">
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
    _id: string;
    name: string;
    description?: string;
  };
  membership: {
    role: "owner" | "admin" | "scorer";
  };
};

function Dashboard({ org }: { org: OrgData }) {
  const tournaments = useQuery(api.tournaments.listTournaments, {});
  const members = useQuery(api.organizations.listMembers, {
    organizationId: org.organization._id as Parameters<typeof api.organizations.listMembers>[0]["organizationId"],
  });
  const roster = useQuery(api.organizations.getRoster, {
    organizationId: org.organization._id as Parameters<typeof api.organizations.getRoster>[0]["organizationId"],
  });

  const canManage = org.membership.role === "owner" || org.membership.role === "admin";

  const activeTournaments = tournaments?.filter((t) => t.status === "active").length ?? 0;
  const totalTournaments = tournaments?.length ?? 0;
  const totalMembers = members?.length ?? 0;
  const totalTeams = roster?.teamNames.length ?? 0;
  const totalPlayers = roster?.playerNames.length ?? 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Dashboard
        </h1>
        {org.organization.description && (
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {org.organization.description}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          href="/tournaments"
          title="Tournaments"
          description={`${activeTournaments} active, ${totalTournaments} total`}
          icon="trophy"
        />
        <DashboardCard
          href="/roster"
          title="Roster"
          description={`${totalTeams} teams, ${totalPlayers} players`}
          icon="users"
          disabled={!canManage}
        />
        <DashboardCard
          href="/members"
          title="Members"
          description={`${totalMembers} member${totalMembers !== 1 ? "s" : ""}`}
          icon="group"
          disabled={!canManage}
        />
      </div>

      {!canManage && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-6">
          Some sections are only available to owners and admins.
        </p>
      )}
    </div>
  );
}

function DashboardCard({
  href,
  title,
  description,
  icon,
  disabled,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 opacity-50">
        <div className="flex items-center gap-3 mb-2">
          <CardIcon name={icon} />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            {title}
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        <CardIcon name={icon} />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </h3>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </Link>
  );
}

function CardIcon({ name }: { name: string }) {
  const className = "w-6 h-6 text-slate-600 dark:text-slate-400";
  
  switch (name) {
    case "trophy":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "group":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    default:
      return null;
  }
}
