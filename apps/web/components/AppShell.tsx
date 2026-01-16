"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { AppNavigation } from "./AppNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const myOrg = useQuery(
    api.organizations.getMyOrganization,
    isAuthenticated ? undefined : "skip"
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  // Not authenticated or no org - show content without navigation
  if (!isAuthenticated || myOrg === undefined || myOrg === null) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Authenticated with org - show navigation sidebar
  return (
    <div className="min-h-screen flex">
      <AppNavigation />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
