import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
 * Seed permissions into the database.
 * This is idempotent - it won't create duplicates.
 * Run this from the Convex dashboard.
 */
export const seedPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const createdPermissions: Array<{ id: Id<"permissions">; key: string }> = [];

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
 * Create a Super Admin role with all permissions.
 * This is idempotent - it won't create duplicates.
 * Run this from the Convex dashboard.
 */
export const seedAdminRole = internalMutation({
  args: {},
  handler: async (ctx) => {
    // First, ensure permissions exist
    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", perm.key))
        .unique();

      if (!existing) {
        await ctx.db.insert("permissions", perm);
      }
    }

    // Check if Super Admin role exists
    let adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Super Admin"))
      .unique();

    if (!adminRole) {
      const roleId = await ctx.db.insert("roles", {
        name: "Super Admin",
        description: "Full system access with all permissions",
      });
      adminRole = await ctx.db.get(roleId);
    }

    if (!adminRole) {
      throw new Error("Failed to create admin role");
    }

    // Get all permissions
    const allPermissions = await ctx.db.query("permissions").collect();

    // Remove existing role permissions
    const existingRolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", adminRole._id))
      .collect();

    for (const rp of existingRolePermissions) {
      await ctx.db.delete(rp._id);
    }

    // Add all permissions to the admin role
    for (const perm of allPermissions) {
      await ctx.db.insert("rolePermissions", {
        roleId: adminRole._id,
        permissionId: perm._id,
      });
    }

    return {
      roleId: adminRole._id,
      roleName: adminRole.name,
      permissionCount: allPermissions.length,
    };
  },
});

/**
 * Make a specific user an admin.
 * Run this from the Convex dashboard with the userId of the user to promote.
 */
export const makeUserAdmin = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the Super Admin role
    let adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Super Admin"))
      .unique();

    if (!adminRole) {
      throw new Error(
        "Super Admin role not found. Run seedAdminRole first."
      );
    }

    // Check if user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get or create user profile
    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (profile) {
      // Update existing profile
      await ctx.db.patch(profile._id, {
        roleId: adminRole._id,
        isActive: true,
      });
    } else {
      // Create new profile
      await ctx.db.insert("userProfiles", {
        userId: args.userId,
        roleId: adminRole._id,
        isActive: true,
      });
    }

    return {
      success: true,
      userId: args.userId,
      userEmail: user.email,
      roleId: adminRole._id,
      roleName: adminRole.name,
    };
  },
});

/**
 * Full setup: seed permissions, create admin role, and make a user admin.
 * This is a convenience function that runs all setup steps.
 * Run this from the Convex dashboard.
 */
export const fullAdminSetup = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Step 1: Seed permissions
    const permissionResults: Array<{ id: Id<"permissions">; key: string }> = [];
    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", perm.key))
        .unique();

      if (!existing) {
        const id = await ctx.db.insert("permissions", perm);
        permissionResults.push({ id, key: perm.key });
      }
    }

    // Step 2: Create or get Super Admin role
    let adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Super Admin"))
      .unique();

    if (!adminRole) {
      const roleId = await ctx.db.insert("roles", {
        name: "Super Admin",
        description: "Full system access with all permissions",
      });
      adminRole = await ctx.db.get(roleId);
    }

    if (!adminRole) {
      throw new Error("Failed to create admin role");
    }

    // Step 3: Assign all permissions to admin role
    const allPermissions = await ctx.db.query("permissions").collect();

    // Clear existing and add all
    const existingRolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", adminRole._id))
      .collect();

    for (const rp of existingRolePermissions) {
      await ctx.db.delete(rp._id);
    }

    for (const perm of allPermissions) {
      await ctx.db.insert("rolePermissions", {
        roleId: adminRole._id,
        permissionId: perm._id,
      });
    }

    // Step 4: Make the specified user an admin
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        roleId: adminRole._id,
        isActive: true,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: args.userId,
        roleId: adminRole._id,
        isActive: true,
      });
    }

    return {
      permissionsCreated: permissionResults.length,
      adminRole: {
        id: adminRole._id,
        name: adminRole.name,
        permissionCount: allPermissions.length,
      },
      adminUser: {
        id: args.userId,
        email: user.email,
      },
    };
  },
});
