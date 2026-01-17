# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MatchPoint Systems - a sports tournament management platform for volleyball. The system supports tournament creation, match scoring, player statistics tracking, and organization management with role-based access control.

This is a Turbo monorepo using pnpm workspaces with:
- Next.js web dashboard for tournament/organization management
- Expo mobile app for match scoring
- Convex backend with authentication and real-time data

## Commands

```bash
# Development (run from repo root)
pnpm dev                      # Start all apps (web + mobile) in dev mode
pnpm dev --filter web         # Start only the web app
pnpm dev --filter mobile      # Start only the mobile app
pnpm --filter @workspace/backend dev  # Start Convex backend dev server

# Mobile app (in apps/mobile)
pnpm ios                      # Start Expo on iOS
pnpm android                  # Start Expo on Android

# Build and Quality
pnpm build                    # Build all packages
pnpm lint                     # Lint all packages
pnpm format                   # Format all .ts, .tsx, .md files with Prettier
pnpm --filter web typecheck   # Type checking for web app

# Adding shadcn/ui components
pnpm dlx shadcn@latest add <component> -c apps/web
```

## Architecture

### Monorepo Structure

- **apps/web** - Next.js 16 dashboard (App Router, Turbopack, React 19)
- **apps/mobile** - Expo 54 React Native app with NativeWind styling
- **packages/backend** - Convex backend (`@workspace/backend`) with schema, mutations, queries
- **packages/ui** - Shared UI component library (`@workspace/ui`)
- **packages/eslint-config** - Shared ESLint configs
- **packages/typescript-config** - Shared TypeScript configs

### Backend (Convex)

The backend uses Convex with `@convex-dev/auth` for password authentication.

Key backend files in `packages/backend/convex/`:
- `schema.ts` - Database schema (organizations, tournaments, matches, matchStats, roles, permissions)
- `auth.ts` - Authentication setup using Password provider
- `lib/auth.ts` - Permission helpers (`requireAdmin`, `hasPermission`, `getUserProfile`)
- `lib/orgAuth.ts` - Organization role helpers (`requireOrgRole`, `canManageOrg`, `isOrgOwner`)

Organization roles: `owner`, `admin`, `scorer`

### Data Model

- **Organizations** - Groups that manage tournaments, with team/player name rosters
- **Tournaments** - Belong to organizations, have status (draft/active/completed)
- **Matches** - Belong to tournaments, track volleyball scoring with sets and point history
- **MatchStats** - Individual player statistics per match (kills, errors, aces, blocks, etc.)

### Web App Integration

The web app connects to Convex via providers in the root layout:
```tsx
<ConvexAuthNextjsServerProvider>
  <ConvexClientProvider>
    {children}
  </ConvexClientProvider>
</ConvexAuthNextjsServerProvider>
```

Import Convex API in components:
```tsx
import { api } from "@workspace/backend/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
```

### UI Package

Import shared components from `@workspace/ui`:
```tsx
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
```

Exports via path aliases:
- `@workspace/ui/components/*` - UI components
- `@workspace/ui/lib/*` - Utilities like `cn()`
- `@workspace/ui/hooks/*` - Shared React hooks

### Mobile App

Expo app with NativeWind for Tailwind CSS styling. Uses `global.css` for styles.

## Key Patterns

- All internal packages use `workspace:*` protocol
- Convex functions use helper wrappers for auth checks before database operations
- Tailwind CSS 4 with `@tailwindcss/postcss` (web) and NativeWind (mobile)
- `cn()` utility combines `clsx` + `tailwind-merge` for class merging
- ESLint uses flat config (v9 style) with `eslint-plugin-only-warn`
