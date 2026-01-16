import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requirePermission } from "./lib/auth";

/**
 * List all roles with permission counts
 */
export const listRoles = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "roles.read");

    const roles = await ctx.db.query("roles").order("asc").collect();

    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const permissions = await ctx.db
          .query("rolePermissions")
          .withIndex("by_role", (q) => q.eq("roleId", role._id))
          .collect();

        // Count users with this role
        const usersWithRole = await ctx.db
          .query("userProfiles")
          .withIndex("by_role", (q) => q.eq("roleId", role._id))
          .collect();

        return {
          ...role,
          permissionCount: permissions.length,
          userCount: usersWithRole.length,
        };
      })
    );

    return rolesWithCounts;
  },
});

/**
 * Get a single role with its permissions
 */
export const getRole = query({
  args: {
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "roles.read");

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    const rolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();

    const permissions = await Promise.all(
      rolePermissions.map((rp) => ctx.db.get(rp.permissionId))
    );

    const usersWithRole = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();

    return {
      ...role,
      permissions: permissions.filter(
        (p): p is NonNullable<typeof p> => p !== null
      ),
      userCount: usersWithRole.length,
    };
  },
});

/**
 * Create a new role
 */
export const createRole = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "roles.write");

    // Check if role name already exists
    const existing = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    if (existing) {
      throw new Error("A role with this name already exists");
    }

    const roleId = await ctx.db.insert("roles", {
      name: args.name,
      description: args.description,
    });

    return { roleId };
  },
});

/**
 * Update a role's name and description
 */
export const updateRole = mutation({
  args: {
    roleId: v.id("roles"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "roles.write");

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Check if new name conflicts with another role
    if (args.name !== role.name) {
      const existing = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .unique();

      if (existing) {
        throw new Error("A role with this name already exists");
      }
    }

    await ctx.db.patch(args.roleId, {
      name: args.name,
      description: args.description,
    });

    return { success: true };
  },
});

/**
 * Delete a role (fails if users are assigned)
 */
export const deleteRole = mutation({
  args: {
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "roles.delete");

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Check if any users have this role
    const usersWithRole = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .first();

    if (usersWithRole) {
      throw new Error(
        "Cannot delete role: users are still assigned to this role"
      );
    }

    // Delete all role-permission associations
    const rolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();

    for (const rp of rolePermissions) {
      await ctx.db.delete(rp._id);
    }

    // Delete the role
    await ctx.db.delete(args.roleId);

    return { success: true };
  },
});

/**
 * Get all permissions for a role
 */
export const getRolePermissions = query({
  args: {
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "roles.read");

    const rolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();

    const permissions = await Promise.all(
      rolePermissions.map((rp) => ctx.db.get(rp.permissionId))
    );

    return permissions.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

/**
 * Assign permissions to a role (replaces all existing permissions)
 */
export const assignPermissions = mutation({
  args: {
    roleId: v.id("roles"),
    permissionIds: v.array(v.id("permissions")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "roles.write");

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Verify all permissions exist
    for (const permId of args.permissionIds) {
      const perm = await ctx.db.get(permId);
      if (!perm) {
        throw new Error(`Permission ${permId} not found`);
      }
    }

    // Delete existing role permissions
    const existingRolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();

    for (const rp of existingRolePermissions) {
      await ctx.db.delete(rp._id);
    }

    // Add new role permissions
    for (const permissionId of args.permissionIds) {
      await ctx.db.insert("rolePermissions", {
        roleId: args.roleId,
        permissionId,
      });
    }

    return { success: true };
  },
});
