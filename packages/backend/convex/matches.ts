import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

export const createMatch = mutation({
  args: {
    format: formatValidator,
    name: v.optional(v.string()),
    participants: v.array(participantValidator),
  },
  returns: v.id("matches"),
  handler: async (ctx, args) => {
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

    return await ctx.db.insert("matches", {
      sport: "volleyball",
      format: args.format,
      status: "scheduled",
      name: args.name,
      participants: args.participants,
    });
  },
});

export const listMatches = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("matches"),
      _creationTime: v.number(),
      sport: v.literal("volleyball"),
      format: formatValidator,
      status: statusValidator,
      name: v.optional(v.string()),
      participants: v.array(participantValidator),
      createdBy: v.optional(v.id("users")),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("matches").order("desc").take(50);
  },
});
