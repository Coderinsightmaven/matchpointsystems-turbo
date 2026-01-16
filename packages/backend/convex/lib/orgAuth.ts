import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

export type OrgRole = "owner" | "admin" | "scorer";

/**
 * Get the current user's membership in an organization
 */
export async function getUserOrgMembership(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
): Promise<Doc<"organizationMembers"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_and_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .unique();

  return membership;
}

/**
 * Get the current user's organization (since user belongs to one org)
 */
export async function getUserOrganization(
  ctx: QueryCtx | MutationCtx
): Promise<{ organization: Doc<"organizations">; membership: Doc<"organizationMembers"> } | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!membership) {
    return null;
  }

  const organization = await ctx.db.get(membership.organizationId);
  if (!organization) {
    return null;
  }

  return { organization, membership };
}

/**
 * Require the current user to be a member of the organization
 * Returns the membership if valid, throws otherwise
 */
export async function requireOrgMembership(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
): Promise<Doc<"organizationMembers">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const membership = await getUserOrgMembership(ctx, organizationId);
  if (!membership) {
    throw new Error("You are not a member of this organization");
  }

  return membership;
}

/**
 * Require the current user to have one of the specified roles in the organization
 * Returns the membership if valid, throws otherwise
 */
export async function requireOrgRole(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  allowedRoles: OrgRole[]
): Promise<Doc<"organizationMembers">> {
  const membership = await requireOrgMembership(ctx, organizationId);

  if (!allowedRoles.includes(membership.role)) {
    throw new Error(
      `This action requires one of these roles: ${allowedRoles.join(", ")}`
    );
  }

  return membership;
}

/**
 * Check if current user can manage the organization (owner or admin)
 */
export async function canManageOrg(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
): Promise<boolean> {
  const membership = await getUserOrgMembership(ctx, organizationId);
  if (!membership) {
    return false;
  }
  return membership.role === "owner" || membership.role === "admin";
}

/**
 * Check if current user is the owner of the organization
 */
export async function isOrgOwner(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
): Promise<boolean> {
  const membership = await getUserOrgMembership(ctx, organizationId);
  if (!membership) {
    return false;
  }
  return membership.role === "owner";
}

/**
 * Get all members of an organization
 */
export async function getOrgMembers(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
): Promise<Array<Doc<"organizationMembers">>> {
  return await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();
}
