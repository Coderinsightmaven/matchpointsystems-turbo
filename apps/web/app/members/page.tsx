"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import { useRouter } from "next/navigation";

export default function MembersPage() {
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const members = useQuery(
    api.organizations.listMembers,
    myOrg ? { organizationId: myOrg.organization._id } : "skip"
  );
  const inviteMember = useMutation(api.organizations.inviteMember);
  const updateMemberRole = useMutation(api.organizations.updateMemberRole);
  const removeMember = useMutation(api.organizations.removeMember);

  const router = useRouter();
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "scorer">("scorer");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = myOrg?.membership.role === "owner" || myOrg?.membership.role === "admin";
  const isOwner = myOrg?.membership.role === "owner";

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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Members
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your organization&apos;s members
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mb-8 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Invite a member
        </h2>
        <div className="flex gap-2 flex-wrap">
          <input
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            placeholder="User ID"
            value={inviteUserId}
            onChange={(e) => setInviteUserId(e.target.value)}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "admin" | "scorer")}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
          >
            <option value="admin">Admin</option>
            <option value="scorer">Scorer</option>
          </select>
          <button
            type="button"
            onClick={() => void handleInvite()}
            disabled={isInviting}
            className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:bg-slate-500"
          >
            {isInviting ? "Inviting..." : "Invite"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Current members
        </h2>

        {members === undefined ? (
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        ) : members.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">No members found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {member.email ?? "Unknown user"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {member.role}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-3">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        void handleRoleChange(
                          member._id,
                          e.target.value as "owner" | "admin" | "scorer"
                        )
                      }
                      className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="scorer">Scorer</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleRemove(member._id)}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
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
    </div>
  );
}
