import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get the current user's profile with role information
 */
export async function getUserProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  return profile;
}

/**
 * Get the current user's permissions based on their role
 */
export async function getUserPermissions(ctx: QueryCtx | MutationCtx) {
  const profile = await getUserProfile(ctx);
  if (!profile || !profile.roleId) {
    return [];
  }

  const rolePermissions = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q) => q.eq("roleId", profile.roleId!))
    .collect();

  const permissions = await Promise.all(
    rolePermissions.map((rp) => ctx.db.get(rp.permissionId))
  );

  return permissions.filter((p): p is NonNullable<typeof p> => p !== null);
}

/**
 * Check if the current user has admin access
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  return hasPermission(ctx, "admin.access");
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(
  ctx: QueryCtx | MutationCtx,
  permissionKey: string
): Promise<boolean> {
  const permissions = await getUserPermissions(ctx);
  return permissions.some((p) => p.key === permissionKey);
}

/**
 * Require the current user to have admin access, throws if not
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const isAdminUser = await isAdmin(ctx);
  if (!isAdminUser) {
    throw new Error("Admin access required");
  }
}

/**
 * Require the current user to have a specific permission, throws if not
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permissionKey: string
): Promise<void> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const hasPerm = await hasPermission(ctx, permissionKey);
  if (!hasPerm) {
    throw new Error(`Permission required: ${permissionKey}`);
  }
}

/**
 * Get or create a user profile for a user
 */
export async function getOrCreateUserProfile(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const existing = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (existing) {
    return existing;
  }

  // Create a new profile with default values
  const profileId = await ctx.db.insert("userProfiles", {
    userId,
    isActive: true,
    roleId: undefined,
  });

  return await ctx.db.get(profileId);
}
