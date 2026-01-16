import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getUserOrganization,
  requireOrgMembership,
  requireOrgRole,
} from "./lib/orgAuth";

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("completed"),
);

const tournamentValidator = v.object({
  _id: v.id("tournaments"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  sport: v.literal("volleyball"),
  name: v.string(),
  description: v.optional(v.string()),
  status: statusValidator,
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  createdBy: v.optional(v.id("users")),
});

/**
 * Create a tournament (owner/admin only)
 */
export const createTournament = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(statusValidator),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.id("tournaments"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's organization
    const userOrg = await getUserOrganization(ctx);
    if (!userOrg) {
      throw new Error("You must belong to an organization to create tournaments");
    }

    // Only owner and admin can create tournaments
    await requireOrgRole(ctx, userOrg.organization._id, ["owner", "admin"]);

    if (
      args.startDate !== undefined &&
      args.endDate !== undefined &&
      args.startDate > args.endDate
    ) {
      throw new Error("Start date must be before end date.");
    }

    return await ctx.db.insert("tournaments", {
      organizationId: userOrg.organization._id,
      sport: "volleyball",
      name: args.name,
      description: args.description,
      status: args.status ?? "draft",
      startDate: args.startDate,
      endDate: args.endDate,
      createdBy: userId,
    });
  },
});

/**
 * List tournaments for the user's organization
 */
export const listTournaments = query({
  args: {},
  returns: v.array(tournamentValidator),
  handler: async (ctx) => {
    const userOrg = await getUserOrganization(ctx);
    if (!userOrg) {
      return [];
    }

    return await ctx.db
      .query("tournaments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", userOrg.organization._id)
      )
      .order("desc")
      .take(50);
  },
});

/**
 * Get a tournament by ID (with membership check)
 */
export const getTournament = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.union(tournamentValidator, v.null()),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return null;
    }

    // Verify user is a member of the tournament's organization
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return null;
    }

    return tournament;
  },
});

/**
 * Update a tournament (owner/admin only)
 */
export const updateTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(statusValidator),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only owner and admin can update tournaments
    await requireOrgRole(ctx, tournament.organizationId, ["owner", "admin"]);

    const updates: Partial<{
      name: string;
      description?: string;
      status: "draft" | "active" | "completed";
      startDate?: number;
      endDate?: number;
    }> = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.status !== undefined) {
      updates.status = args.status;
    }
    if (args.startDate !== undefined) {
      updates.startDate = args.startDate;
    }
    if (args.endDate !== undefined) {
      updates.endDate = args.endDate;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided.");
    }

    if (
      updates.startDate !== undefined &&
      updates.endDate !== undefined &&
      updates.startDate > updates.endDate
    ) {
      throw new Error("Start date must be before end date.");
    }

    await ctx.db.patch(args.tournamentId, updates);
    return null;
  },
});
