import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requirePermission, getOrCreateUserProfile } from "./lib/auth";
import { Id } from "./_generated/dataModel";

/**
 * List all users with their profiles and roles
 */
export const listUsers = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.read");

    const limit = args.limit ?? 50;

    // Get all users from the auth users table
    const users = await ctx.db.query("users").order("desc").take(limit);

    // Enrich with profile and role data
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .unique();

        let role = null;
        if (profile?.roleId) {
          role = await ctx.db.get(profile.roleId);
        }

        return {
          _id: user._id,
          _creationTime: user._creationTime,
          email: user.email,
          emailVerificationTime: user.emailVerificationTime,
          profile: profile
            ? {
                _id: profile._id,
                isActive: profile.isActive,
                deactivatedAt: profile.deactivatedAt,
                lastPasswordResetAt: profile.lastPasswordResetAt,
              }
            : null,
          role: role
            ? {
                _id: role._id,
                name: role.name,
              }
            : null,
        };
      })
    );

    return enrichedUsers;
  },
});

/**
 * Get a single user with full details
 */
export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.read");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    let role = null;
    let rolePermissions: Array<{ key: string; name: string }> = [];

    if (profile?.roleId) {
      role = await ctx.db.get(profile.roleId);

      if (role) {
        const rps = await ctx.db
          .query("rolePermissions")
          .withIndex("by_role", (q) => q.eq("roleId", role!._id))
          .collect();

        const perms = await Promise.all(
          rps.map((rp) => ctx.db.get(rp.permissionId))
        );

        rolePermissions = perms
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map((p) => ({ key: p.key, name: p.name }));
      }
    }

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      email: user.email,
      emailVerificationTime: user.emailVerificationTime,
      profile: profile
        ? {
            _id: profile._id,
            isActive: profile.isActive,
            deactivatedAt: profile.deactivatedAt,
            lastPasswordResetAt: profile.lastPasswordResetAt,
            roleId: profile.roleId,
          }
        : null,
      role: role
        ? {
            _id: role._id,
            name: role.name,
            description: role.description,
          }
        : null,
      permissions: rolePermissions,
    };
  },
});

/**
 * Update a user's role
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    roleId: v.optional(v.id("roles")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.write");

    // Verify role exists if provided
    if (args.roleId) {
      const role = await ctx.db.get(args.roleId);
      if (!role) {
        throw new Error("Role not found");
      }
    }

    // Get or create user profile
    const profile = await getOrCreateUserProfile(ctx, args.userId);
    if (!profile) {
      throw new Error("Could not create user profile");
    }

    await ctx.db.patch(profile._id, {
      roleId: args.roleId,
    });

    return { success: true };
  },
});

/**
 * Deactivate a user account
 */
export const deactivateUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.delete");

    const profile = await getOrCreateUserProfile(ctx, args.userId);
    if (!profile) {
      throw new Error("Could not create user profile");
    }

    await ctx.db.patch(profile._id, {
      isActive: false,
      deactivatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Activate a user account
 */
export const activateUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.delete");

    const profile = await getOrCreateUserProfile(ctx, args.userId);
    if (!profile) {
      throw new Error("Could not create user profile");
    }

    await ctx.db.patch(profile._id, {
      isActive: true,
      deactivatedAt: undefined,
    });

    return { success: true };
  },
});

/**
 * Reset a user's password (admin sets new password directly)
 * This generates a temporary password that the user should change
 */
export const resetPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "users.reset");

    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Find the password auth account for this user
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("provider"), "password")
        )
      )
      .unique();

    if (!authAccount) {
      throw new Error("No password account found for this user");
    }

    // Hash the new password using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(args.newPassword);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Update the auth account with the new password hash
    await ctx.db.patch(authAccount._id, {
      secret: hashedPassword,
    });

    // Update profile to track password reset
    const profile = await getOrCreateUserProfile(ctx, args.userId);
    if (profile) {
      await ctx.db.patch(profile._id, {
        lastPasswordResetAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Create a user profile for a user if it doesn't exist (internal use)
 */
export const ensureUserProfile = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await getOrCreateUserProfile(ctx, args.userId);
  },
});
