import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { requirePermission } from "./lib/auth";

// Default permissions that should exist in the system
const DEFAULT_PERMISSIONS = [
  {
    key: "users.read",
    name: "View Users",
    description: "View the list of users and their details",
  },
  {
    key: "users.write",
    name: "Edit Users",
    description: "Edit users and assign roles",
  },
  {
    key: "users.delete",
    name: "Manage User Status",
    description: "Activate and deactivate user accounts",
  },
  {
    key: "users.reset",
    name: "Reset Passwords",
    description: "Reset user passwords",
  },
  {
    key: "roles.read",
    name: "View Roles",
    description: "View roles and their permissions",
  },
  {
    key: "roles.write",
    name: "Manage Roles",
    description: "Create and edit roles, assign permissions",
  },
  {
    key: "roles.delete",
    name: "Delete Roles",
    description: "Delete roles from the system",
  },
  {
    key: "admin.access",
    name: "Admin Access",
    description: "Access the admin panel",
  },
];

/**
 * List all available permissions
 */
export const listPermissions = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "roles.read");

    const permissions = await ctx.db.query("permissions").order("asc").collect();
    return permissions;
  },
});

/**
 * Seed default permissions into the database (internal use only)
 * This is idempotent - it won't create duplicates
 */
export const seedPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const createdPermissions = [];

    for (const perm of DEFAULT_PERMISSIONS) {
      // Check if permission already exists
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", perm.key))
        .unique();

      if (!existing) {
        const id = await ctx.db.insert("permissions", perm);
        createdPermissions.push({ id, key: perm.key });
      }
    }

    return {
      created: createdPermissions.length,
      permissions: createdPermissions,
    };
  },
});

/**
 * Get a permission by key
 */
export const getPermissionByKey = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const permission = await ctx.db
      .query("permissions")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    return permission;
  },
});
