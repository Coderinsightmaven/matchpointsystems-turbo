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

  // Organizations table
  organizations: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    teamNames: v.optional(v.array(v.string())),
    playerNames: v.optional(v.array(v.string())),
  }).index("by_name", ["name"]),

  // Organization members - links users to orgs with roles
  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("scorer"),
    ),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_and_user", ["organizationId", "userId"]),

  tournaments: defineTable({
    organizationId: v.id("organizations"),
    sport: v.literal("volleyball"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("completed"),
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    archived: v.optional(v.boolean()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_sport", ["sport"])
    .index("by_status", ["status"]),

  matches: defineTable({
    organizationId: v.id("organizations"),
    sport: v.literal("volleyball"),
    format: v.union(
      v.literal("singles"),
      v.literal("doubles"),
      v.literal("teams"),
    ),
    division: v.optional(v.union(
      v.literal("mens"),
      v.literal("womens"),
      v.literal("mixed"),
    )),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
    name: v.optional(v.string()),
    participants: v.array(
      v.object({
        side: v.union(v.literal("home"), v.literal("away")),
        teamName: v.optional(v.string()),
        players: v.array(v.string()),
      }),
    ),
    tournamentId: v.id("tournaments"),
    createdBy: v.optional(v.id("users")),
    // Scoring fields
    scoringFormat: v.optional(v.union(
      v.literal("standard"),
      v.literal("avp_beach"),
    )),
    score: v.optional(v.object({
      currentSet: v.number(),
      home: v.number(),
      away: v.number(),
      setsWon: v.object({
        home: v.number(),
        away: v.number(),
      }),
      setHistory: v.array(v.object({
        home: v.number(),
        away: v.number(),
      })),
    })),
    // Point history for undo functionality
    pointHistory: v.optional(v.array(v.object({
      side: v.union(v.literal("home"), v.literal("away")),
      setNumber: v.number(),
      homeScore: v.number(),
      awayScore: v.number(),
    }))),
  })
    .index("by_organization", ["organizationId"])
    .index("by_sport", ["sport"])
    .index("by_status", ["status"])
    .index("by_sport_and_status", ["sport", "status"])
    .index("by_tournament", ["tournamentId"]),

  // Match stats for tracking player/team statistics
  matchStats: defineTable({
    matchId: v.id("matches"),
    organizationId: v.id("organizations"),
    playerName: v.string(),
    side: v.union(v.literal("home"), v.literal("away")),
    statType: v.string(), // "kill", "error", "ace", "service_error", "dig", "block", "assist"
    value: v.number(),    // count (usually 1, but allows batch entry)
    setNumber: v.optional(v.number()), // which set this occurred in
  })
    .index("by_match", ["matchId"])
    .index("by_match_and_player", ["matchId", "playerName"])
    .index("by_organization", ["organizationId"]),
});
