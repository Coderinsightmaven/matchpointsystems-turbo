import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgRole } from "./lib/orgAuth";

const sideValidator = v.union(v.literal("home"), v.literal("away"));

// Volleyball stat types - can be extended for other sports
export const VOLLEYBALL_STATS = [
  "kill",
  "error",
  "ace",
  "service_error",
  "dig",
  "block",
  "assist",
] as const;

export type VolleyballStatType = (typeof VOLLEYBALL_STATS)[number];

const statEntryValidator = v.object({
  _id: v.id("matchStats"),
  _creationTime: v.number(),
  matchId: v.id("matches"),
  organizationId: v.id("organizations"),
  playerName: v.string(),
  side: sideValidator,
  statType: v.string(),
  value: v.number(),
  setNumber: v.optional(v.number()),
});

/**
 * Record a single stat for a player
 */
export const recordStat = mutation({
  args: {
    matchId: v.id("matches"),
    playerName: v.string(),
    side: sideValidator,
    statType: v.string(),
    setNumber: v.optional(v.number()),
  },
  returns: v.id("matchStats"),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Scorers, admins, and owners can record stats
    await requireOrgRole(ctx, match.organizationId, ["owner", "admin", "scorer"]);

    return await ctx.db.insert("matchStats", {
      matchId: args.matchId,
      organizationId: match.organizationId,
      playerName: args.playerName,
      side: args.side,
      statType: args.statType,
      value: 1,
      setNumber: args.setNumber,
    });
  },
});

/**
 * Update stats for a player in batch (for post-match editing)
 */
export const updatePlayerStats = mutation({
  args: {
    matchId: v.id("matches"),
    playerName: v.string(),
    side: sideValidator,
    stats: v.array(v.object({
      statType: v.string(),
      value: v.number(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Only admins and owners can batch update stats
    await requireOrgRole(ctx, match.organizationId, ["owner", "admin"]);

    // Get existing stats for this player in this match
    const existingStats = await ctx.db
      .query("matchStats")
      .withIndex("by_match_and_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerName", args.playerName)
      )
      .collect();

    // For each stat type in the update
    for (const { statType, value } of args.stats) {
      // Find existing entry for this stat type
      const existing = existingStats.find((s) => s.statType === statType);

      if (existing) {
        if (value === 0) {
          // Delete if value is 0
          await ctx.db.delete(existing._id);
        } else {
          // Update existing
          await ctx.db.patch(existing._id, { value });
        }
      } else if (value > 0) {
        // Create new entry
        await ctx.db.insert("matchStats", {
          matchId: args.matchId,
          organizationId: match.organizationId,
          playerName: args.playerName,
          side: args.side,
          statType,
          value,
        });
      }
    }

    return null;
  },
});

/**
 * Delete a specific stat entry
 */
export const deleteStat = mutation({
  args: {
    statId: v.id("matchStats"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stat = await ctx.db.get(args.statId);
    if (!stat) {
      throw new Error("Stat not found");
    }

    await requireOrgRole(ctx, stat.organizationId, ["owner", "admin", "scorer"]);

    await ctx.db.delete(args.statId);
    return null;
  },
});

/**
 * Undo the last stat recorded for a player (most recent entry)
 */
export const undoLastStat = mutation({
  args: {
    matchId: v.id("matches"),
    playerName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    await requireOrgRole(ctx, match.organizationId, ["owner", "admin", "scorer"]);

    // Get the most recent stat for this player
    const stats = await ctx.db
      .query("matchStats")
      .withIndex("by_match_and_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerName", args.playerName)
      )
      .order("desc")
      .take(1);

    if (stats.length > 0) {
      await ctx.db.delete(stats[0]._id);
    }

    return null;
  },
});

/**
 * Get all stats for a match, grouped by player
 */
export const getMatchStats = query({
  args: {
    matchId: v.id("matches"),
  },
  returns: v.object({
    players: v.array(v.object({
      playerName: v.string(),
      side: sideValidator,
      stats: v.record(v.string(), v.number()),
    })),
    teamTotals: v.object({
      home: v.record(v.string(), v.number()),
      away: v.record(v.string(), v.number()),
    }),
  }),
  handler: async (ctx, args) => {
    const allStats = await ctx.db
      .query("matchStats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    // Group by player
    const playerMap = new Map<string, { side: "home" | "away"; stats: Record<string, number> }>();
    const teamTotals: { home: Record<string, number>; away: Record<string, number> } = {
      home: {},
      away: {},
    };

    for (const stat of allStats) {
      // Player stats
      if (!playerMap.has(stat.playerName)) {
        playerMap.set(stat.playerName, { side: stat.side, stats: {} });
      }
      const player = playerMap.get(stat.playerName)!;
      player.stats[stat.statType] = (player.stats[stat.statType] || 0) + stat.value;

      // Team totals
      const teamStats = teamTotals[stat.side];
      teamStats[stat.statType] = (teamStats[stat.statType] || 0) + stat.value;
    }

    const players = Array.from(playerMap.entries()).map(([playerName, data]) => ({
      playerName,
      side: data.side,
      stats: data.stats,
    }));

    // Sort players: home side first, then by name
    players.sort((a, b) => {
      if (a.side !== b.side) {
        return a.side === "home" ? -1 : 1;
      }
      return a.playerName.localeCompare(b.playerName);
    });

    return { players, teamTotals };
  },
});

/**
 * Get stats summary for display (includes match info)
 */
export const getMatchStatsSummary = query({
  args: {
    matchId: v.id("matches"),
  },
  returns: v.union(
    v.object({
      matchName: v.optional(v.string()),
      homeTeam: v.string(),
      awayTeam: v.string(),
      homePlayers: v.array(v.string()),
      awayPlayers: v.array(v.string()),
      players: v.array(v.object({
        playerName: v.string(),
        side: sideValidator,
        stats: v.record(v.string(), v.number()),
      })),
      teamTotals: v.object({
        home: v.record(v.string(), v.number()),
        away: v.record(v.string(), v.number()),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    const home = match.participants.find((p) => p.side === "home");
    const away = match.participants.find((p) => p.side === "away");

    const allStats = await ctx.db
      .query("matchStats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    // Group by player
    const playerMap = new Map<string, { side: "home" | "away"; stats: Record<string, number> }>();
    const teamTotals: { home: Record<string, number>; away: Record<string, number> } = {
      home: {},
      away: {},
    };

    for (const stat of allStats) {
      if (!playerMap.has(stat.playerName)) {
        playerMap.set(stat.playerName, { side: stat.side, stats: {} });
      }
      const player = playerMap.get(stat.playerName)!;
      player.stats[stat.statType] = (player.stats[stat.statType] || 0) + stat.value;

      const teamStats = teamTotals[stat.side];
      teamStats[stat.statType] = (teamStats[stat.statType] || 0) + stat.value;
    }

    const players = Array.from(playerMap.entries()).map(([playerName, data]) => ({
      playerName,
      side: data.side,
      stats: data.stats,
    }));

    players.sort((a, b) => {
      if (a.side !== b.side) {
        return a.side === "home" ? -1 : 1;
      }
      return a.playerName.localeCompare(b.playerName);
    });

    return {
      matchName: match.name,
      homeTeam: home?.teamName || home?.players.join(", ") || "Home",
      awayTeam: away?.teamName || away?.players.join(", ") || "Away",
      homePlayers: home?.players || [],
      awayPlayers: away?.players || [],
      players,
      teamTotals,
    };
  },
});
