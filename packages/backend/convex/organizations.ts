import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getUserOrganization,
  requireOrgMembership,
  requireOrgRole,
  getOrgMembers,
  isOrgOwner,
  canManageOrg,
} from "./lib/orgAuth";

const orgRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("scorer")
);

/**
 * Create a new organization and add the creator as owner
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user already belongs to an organization
    const existingOrg = await getUserOrganization(ctx);
    if (existingOrg) {
      throw new Error("You already belong to an organization");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Organization name is required");
    }

    // Create the organization
    const orgId = await ctx.db.insert("organizations", {
      name: trimmedName,
      description: args.description?.trim() || undefined,
      createdBy: userId,
    });

    // Add creator as owner
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId,
      role: "owner",
    });

    return orgId;
  },
});

/**
 * Get an organization by ID (with membership check)
 */
export const getOrganization = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return null;
    }

    return await ctx.db.get(args.organizationId);
  },
});

/**
 * Get the current user's organization
 */
export const getMyOrganization = query({
  args: {},
  returns: v.union(
    v.object({
      organization: v.object({
        _id: v.id("organizations"),
        _creationTime: v.number(),
        name: v.string(),
        description: v.optional(v.string()),
        createdBy: v.id("users"),
      }),
      membership: v.object({
        _id: v.id("organizationMembers"),
        _creationTime: v.number(),
        organizationId: v.id("organizations"),
        userId: v.id("users"),
        role: orgRoleValidator,
      }),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    return await getUserOrganization(ctx);
  },
});

/**
 * List members of an organization
 */
export const listMembers = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("organizationMembers"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      userId: v.id("users"),
      role: orgRoleValidator,
      email: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Verify membership
    await requireOrgMembership(ctx, args.organizationId);

    const members = await getOrgMembers(ctx, args.organizationId);

    // Fetch user emails
    const membersWithEmail = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          email: user?.email ?? undefined,
        };
      })
    );

    return membersWithEmail;
  },
});

/**
 * Invite a member to the organization (owner/admin only)
 */
export const inviteMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: orgRoleValidator,
  },
  returns: v.id("organizationMembers"),
  handler: async (ctx, args) => {
    // Only owner and admin can invite
    await requireOrgRole(ctx, args.organizationId, ["owner", "admin"]);

    // Check if user already belongs to any organization
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingMembership) {
      throw new Error("User already belongs to an organization");
    }

    // Only owner can add another owner
    if (args.role === "owner") {
      const isOwner = await isOrgOwner(ctx, args.organizationId);
      if (!isOwner) {
        throw new Error("Only owners can add other owners");
      }
    }

    return await ctx.db.insert("organizationMembers", {
      organizationId: args.organizationId,
      userId: args.userId,
      role: args.role,
    });
  },
});

/**
 * Update a member's role (owner only)
 */
export const updateMemberRole = mutation({
  args: {
    memberId: v.id("organizationMembers"),
    role: orgRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Only owner can change roles
    await requireOrgRole(ctx, member.organizationId, ["owner"]);

    const currentUserId = await getAuthUserId(ctx);
    if (member.userId === currentUserId && args.role !== "owner") {
      // Prevent owner from demoting themselves if they're the only owner
      const allMembers = await getOrgMembers(ctx, member.organizationId);
      const owners = allMembers.filter((m) => m.role === "owner");
      if (owners.length === 1 && owners[0]?.userId === currentUserId) {
        throw new Error("Cannot demote yourself when you are the only owner");
      }
    }

    await ctx.db.patch(args.memberId, { role: args.role });
    return null;
  },
});

/**
 * Remove a member from the organization (owner/admin only)
 */
export const removeMember = mutation({
  args: {
    memberId: v.id("organizationMembers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Only owner and admin can remove members
    await requireOrgRole(ctx, member.organizationId, ["owner", "admin"]);

    const currentUserId = await getAuthUserId(ctx);

    // Prevent removing yourself if you're the only owner
    if (member.userId === currentUserId) {
      const allMembers = await getOrgMembers(ctx, member.organizationId);
      const owners = allMembers.filter((m) => m.role === "owner");
      if (owners.length === 1 && owners[0]?.userId === currentUserId) {
        throw new Error("Cannot remove yourself when you are the only owner");
      }
    }

    // Admins cannot remove owners
    if (member.role === "owner") {
      const isOwner = await isOrgOwner(ctx, member.organizationId);
      if (!isOwner) {
        throw new Error("Only owners can remove other owners");
      }
    }

    await ctx.db.delete(args.memberId);
    return null;
  },
});

/**
 * Update organization details (owner/admin only)
 */
export const updateOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.organizationId, ["owner", "admin"]);

    const updates: { name?: string; description?: string } = {};

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      if (!trimmedName) {
        throw new Error("Organization name cannot be empty");
      }
      updates.name = trimmedName;
    }

    if (args.description !== undefined) {
      updates.description = args.description.trim() || undefined;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.organizationId, updates);
    }

    return null;
  },
});
