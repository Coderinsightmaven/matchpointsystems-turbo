import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgRole } from "./lib/orgAuth";

const sideValidator = v.union(v.literal("home"), v.literal("away"));
const scoringFormatValidator = v.union(v.literal("standard"), v.literal("avp_beach"));

/**
 * Get scoring rules based on format
 */
function getScoringRules(format: "standard" | "avp_beach") {
  if (format === "standard") {
    return { setsToWin: 3, pointsPerSet: 25, tiebreakerPoints: 15, maxSets: 5 };
  }
  return { setsToWin: 2, pointsPerSet: 21, tiebreakerPoints: 15, maxSets: 3 };
}

/**
 * Check if a set has been won
 */
function checkSetWin(home: number, away: number, pointsToWin: number): "home" | "away" | null {
  if (home >= pointsToWin && home - away >= 2) {
    return "home";
  }
  if (away >= pointsToWin && away - home >= 2) {
    return "away";
  }
  return null;
}

/**
 * Get points needed to win current set
 */
function getPointsToWin(currentSet: number, rules: ReturnType<typeof getScoringRules>): number {
  const isTiebreaker = currentSet === rules.maxSets;
  return isTiebreaker ? rules.tiebreakerPoints : rules.pointsPerSet;
}

/**
 * Start a match - initialize scoring
 */
export const startMatch = mutation({
  args: {
    matchId: v.id("matches"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Only scorers, admins, and owners can score
    await requireOrgRole(ctx, match.organizationId, ["owner", "admin", "scorer"]);

    if (match.status !== "scheduled") {
      throw new Error("Match has already started or completed");
    }

    if (!match.scoringFormat) {
      throw new Error("Match does not have a scoring format set");
    }

    await ctx.db.patch(args.matchId, {
      status: "in_progress",
      score: {
        currentSet: 1,
        home: 0,
        away: 0,
        setsWon: { home: 0, away: 0 },
        setHistory: [],
      },
      pointHistory: [],
    });

    return null;
  },
});

/**
 * Add a point to a side
 */
export const addPoint = mutation({
  args: {
    matchId: v.id("matches"),
    side: sideValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    await requireOrgRole(ctx, match.organizationId, ["owner", "admin", "scorer"]);

    if (match.status !== "in_progress") {
      throw new Error("Match is not in progress");
    }

    if (!match.score || !match.scoringFormat) {
      throw new Error("Match score not initialized");
    }

    const rules = getScoringRules(match.scoringFormat);
    const score = { ...match.score };
    const pointHistory = [...(match.pointHistory ?? [])];

    // Record point in history before applying
    pointHistory.push({
      side: args.side,
      setNumber: score.currentSet,
      homeScore: score.home,
      awayScore: score.away,
    });

    // Add point
    if (args.side === "home") {
      score.home += 1;
    } else {
      score.away += 1;
    }

    // Check for set win
    const pointsToWin = getPointsToWin(score.currentSet, rules);
    const setWinner = checkSetWin(score.home, score.away, pointsToWin);

    if (setWinner) {
      // Record set in history
      score.setHistory = [
        ...score.setHistory,
        { home: score.home, away: score.away },
      ];

      // Update sets won
      score.setsWon = {
        ...score.setsWon,
        [setWinner]: score.setsWon[setWinner] + 1,
      };

      // Check for match win
      if (score.setsWon[setWinner] >= rules.setsToWin) {
        // Match is over
        await ctx.db.patch(args.matchId, {
          status: "completed",
          score,
          pointHistory,
        });
        return null;
      }

      // Start next set
      score.currentSet += 1;
      score.home = 0;
      score.away = 0;
    }

    await ctx.db.patch(args.matchId, {
      score,
      pointHistory,
    });

    return null;
  },
});

/**
 * Undo the last point
 */
export const undoPoint = mutation({
  args: {
    matchId: v.id("matches"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    await requireOrgRole(ctx, match.organizationId, ["owner", "admin", "scorer"]);

    if (match.status !== "in_progress") {
      throw new Error("Match is not in progress");
    }

    if (!match.score || !match.pointHistory || match.pointHistory.length === 0) {
      throw new Error("No points to undo");
    }

    const pointHistory = [...match.pointHistory];
    const lastPoint = pointHistory.pop()!;

    // If we're undoing a point from a previous set, we need to restore that set
    if (lastPoint.setNumber < match.score.currentSet) {
      // We need to restore the previous set
      const setHistory = [...match.score.setHistory];
      const previousSet = setHistory.pop();
      
      if (!previousSet) {
        throw new Error("Cannot undo: set history inconsistent");
      }

      // Figure out who won that set and decrement their sets won
      const setsWon = { ...match.score.setsWon };
      if (previousSet.home > previousSet.away) {
        setsWon.home -= 1;
      } else {
        setsWon.away -= 1;
      }

      await ctx.db.patch(args.matchId, {
        score: {
          currentSet: lastPoint.setNumber,
          home: lastPoint.homeScore,
          away: lastPoint.awayScore,
          setsWon,
          setHistory,
        },
        pointHistory,
      });
    } else {
      // Simple undo within current set
      await ctx.db.patch(args.matchId, {
        score: {
          ...match.score,
          home: lastPoint.homeScore,
          away: lastPoint.awayScore,
        },
        pointHistory,
      });
    }

    return null;
  },
});

/**
 * End a match early (forfeit or manual end)
 */
export const endMatch = mutation({
  args: {
    matchId: v.id("matches"),
    winner: v.optional(sideValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    await requireOrgRole(ctx, match.organizationId, ["owner", "admin"]);

    if (match.status === "completed") {
      throw new Error("Match is already completed");
    }

    await ctx.db.patch(args.matchId, {
      status: "completed",
    });

    return null;
  },
});

/**
 * Get match with score for real-time display
 */
export const getMatchScore = query({
  args: {
    matchId: v.id("matches"),
  },
  returns: v.union(
    v.object({
      _id: v.id("matches"),
      name: v.optional(v.string()),
      status: v.union(
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
      ),
      scoringFormat: v.optional(scoringFormatValidator),
      participants: v.array(
        v.object({
          side: sideValidator,
          teamName: v.optional(v.string()),
          players: v.array(v.string()),
        }),
      ),
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
      canUndo: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    return {
      _id: match._id,
      name: match.name,
      status: match.status,
      scoringFormat: match.scoringFormat,
      participants: match.participants,
      score: match.score,
      canUndo: (match.pointHistory?.length ?? 0) > 0,
    };
  },
});
