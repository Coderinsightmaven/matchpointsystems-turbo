import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),

  // Roles table - defines available roles in the system
  roles: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
  }).index("by_name", ["name"]),

  // Permissions table - defines available permissions
  permissions: defineTable({
    key: v.string(), // e.g., "users.read", "users.write"
    name: v.string(), // e.g., "View Users"
    description: v.optional(v.string()),
  }).index("by_key", ["key"]),

  // Junction table for role-permission relationships
  rolePermissions: defineTable({
    roleId: v.id("roles"),
    permissionId: v.id("permissions"),
  })
    .index("by_role", ["roleId"])
    .index("by_permission", ["permissionId"]),

  // Extended user profile - links to auth users table
  userProfiles: defineTable({
    userId: v.id("users"),
    roleId: v.optional(v.id("roles")),
    isActive: v.boolean(),
    deactivatedAt: v.optional(v.number()),
    lastPasswordResetAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["roleId"])
    .index("by_active", ["isActive"]),

  matches: defineTable({
    sport: v.literal("volleyball"),
    format: v.union(
      v.literal("singles"),
      v.literal("doubles"),
      v.literal("teams"),
    ),
    status: v.union(v.literal("scheduled"), v.literal("completed")),
    name: v.optional(v.string()),
    participants: v.array(
      v.object({
        side: v.union(v.literal("home"), v.literal("away")),
        teamName: v.optional(v.string()),
        players: v.array(v.string()),
      }),
    ),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_sport", ["sport"])
    .index("by_status", ["status"])
    .index("by_sport_and_status", ["sport", "status"]),
});
