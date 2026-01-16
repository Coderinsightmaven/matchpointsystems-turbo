import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("completed"),
);

const tournamentValidator = v.object({
  _id: v.id("tournaments"),
  _creationTime: v.number(),
  sport: v.literal("volleyball"),
  name: v.string(),
  description: v.optional(v.string()),
  status: statusValidator,
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  createdBy: v.optional(v.id("users")),
});

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
    if (
      args.startDate !== undefined &&
      args.endDate !== undefined &&
      args.startDate > args.endDate
    ) {
      throw new Error("Start date must be before end date.");
    }

    return await ctx.db.insert("tournaments", {
      sport: "volleyball",
      name: args.name,
      description: args.description,
      status: args.status ?? "draft",
      startDate: args.startDate,
      endDate: args.endDate,
    });
  },
});

export const listTournaments = query({
  args: {},
  returns: v.array(tournamentValidator),
  handler: async (ctx) => {
    return await ctx.db.query("tournaments").order("desc").take(50);
  },
});

export const getTournament = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.union(tournamentValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tournamentId);
  },
});

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
