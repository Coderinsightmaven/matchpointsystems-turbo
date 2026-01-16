import { query } from "./_generated/server";
import { isAdmin } from "./lib/auth";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Check if the current user has admin access.
 * This doesn't throw - returns false if not authenticated or not admin.
 */
export const checkAdminAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isAdmin: false };
    }

    const hasAdminAccess = await isAdmin(ctx);
    return { isAdmin: hasAdminAccess };
  },
});
