import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getUserOrganization,
  requireOrgMembership,
  requireOrgRole,
} from "./lib/orgAuth";

const participantValidator = v.object({
  side: v.union(v.literal("home"), v.literal("away")),
  teamName: v.optional(v.string()),
  players: v.array(v.string()),
});

const formatValidator = v.union(
  v.literal("singles"),
  v.literal("doubles"),
  v.literal("teams"),
);

const statusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
);

const matchValidator = v.object({
  _id: v.id("matches"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  sport: v.literal("volleyball"),
  format: formatValidator,
  status: statusValidator,
  name: v.optional(v.string()),
  participants: v.array(participantValidator),
  tournamentId: v.optional(v.id("tournaments")),
  createdBy: v.optional(v.id("users")),
});

/**
 * Create a match (owner/admin only, or scorer if tournament exists)
 * Match inherits organizationId from tournament, or uses user's org for standalone matches
 */
export const createMatch = mutation({
  args: {
    format: formatValidator,
    name: v.optional(v.string()),
    participants: v.array(participantValidator),
    tournamentId: v.optional(v.id("tournaments")),
  },
  returns: v.id("matches"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (args.participants.length !== 2) {
      throw new Error("Exactly two sides are required.");
    }

    const sides = args.participants.map((participant) => participant.side);
    if (!sides.includes("home") || !sides.includes("away")) {
      throw new Error("Participants must include home and away sides.");
    }

    if (args.format === "teams") {
      for (const participant of args.participants) {
        if (!participant.teamName) {
          throw new Error("Teams format requires a team name for each side.");
        }
      }
    } else {
      const requiredPlayers = args.format === "singles" ? 1 : 2;
      for (const participant of args.participants) {
        if (participant.players.length !== requiredPlayers) {
          throw new Error(
            `${args.format} format requires ${requiredPlayers} player(s) per side.`,
          );
        }
      }
    }

    let organizationId;

    if (args.tournamentId) {
      // Match belongs to a tournament - inherit organization
      const tournament = await ctx.db.get(args.tournamentId);
      if (!tournament) {
        throw new Error("Tournament not found.");
      }
      organizationId = tournament.organizationId;

      // Only owner and admin can create matches within a tournament
      await requireOrgRole(ctx, organizationId, ["owner", "admin"]);
    } else {
      // Standalone match - use user's organization
      const userOrg = await getUserOrganization(ctx);
      if (!userOrg) {
        throw new Error("You must belong to an organization to create matches");
      }
      organizationId = userOrg.organization._id;

      // Only owner and admin can create standalone matches
      await requireOrgRole(ctx, organizationId, ["owner", "admin"]);
    }

    return await ctx.db.insert("matches", {
      organizationId,
      sport: "volleyball",
      format: args.format,
      status: "scheduled",
      name: args.name,
      participants: args.participants,
      tournamentId: args.tournamentId,
      createdBy: userId,
    });
  },
});

/**
 * List all matches for user's organization
 */
export const listMatches = query({
  args: {},
  returns: v.array(matchValidator),
  handler: async (ctx) => {
    const userOrg = await getUserOrganization(ctx);
    if (!userOrg) {
      return [];
    }

    return await ctx.db
      .query("matches")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", userOrg.organization._id)
      )
      .order("desc")
      .take(50);
  },
});

/**
 * List matches by tournament (with membership check)
 */
export const listMatchesByTournament = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.array(matchValidator),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return [];
    }

    // Verify membership
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return [];
    }

    return await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId),
      )
      .order("desc")
      .take(50);
  },
});

/**
 * Update match status (scorer, admin, owner can do this)
 */
export const updateMatchStatus = mutation({
  args: {
    matchId: v.id("matches"),
    status: statusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Scorers can update match status
    await requireOrgRole(ctx, match.organizationId, ["owner", "admin", "scorer"]);

    await ctx.db.patch(args.matchId, { status: args.status });
    return null;
  },
});
