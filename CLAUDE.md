# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Turbo monorepo for building applications with shadcn/ui components. It uses pnpm workspaces with shared configuration packages.

## Commands

```bash
# Development
pnpm dev              # Start all apps in dev mode (uses Turbopack)
pnpm dev --filter web # Start only the web app

# Build and Quality
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format all .ts, .tsx, .md files with Prettier

# Type checking (in apps/web)
pnpm --filter web typecheck

# Adding shadcn/ui components
pnpm dlx shadcn@latest add <component> -c apps/web
```

## Architecture

### Monorepo Structure

- **apps/web** - Next.js 16 application (App Router, Turbopack, React 19)
- **packages/ui** - Shared UI component library (`@workspace/ui`)
- **packages/eslint-config** - Shared ESLint configs (`@workspace/eslint-config`)
- **packages/typescript-config** - Shared TypeScript configs (`@workspace/typescript-config`)

### Package Relationships

The web app imports shared UI components from `@workspace/ui`:
```tsx
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
```

### UI Package Exports

The `@workspace/ui` package exports via path aliases:
- `@workspace/ui/components/*` - UI components (from `src/components/`)
- `@workspace/ui/lib/*` - Utilities like `cn()` (from `src/lib/`)
- `@workspace/ui/hooks/*` - Shared React hooks (from `src/hooks/`)
- `@workspace/ui/globals.css` - Global styles with Tailwind
- `@workspace/ui/postcss.config` - PostCSS config for Tailwind

### ESLint Configurations

Three configs available from `@workspace/eslint-config`:
- `./base` - Base TypeScript config
- `./next-js` - For Next.js apps
- `./react-internal` - For React library packages

### shadcn/ui Setup

- Style: New York
- React Server Components enabled
- Icon library: Lucide React
- Components are installed to `packages/ui/src/components/`
- Uses CSS variables for theming (neutral base color)

## Key Patterns

- All internal packages use `workspace:*` protocol
- Tailwind CSS 4 with `@tailwindcss/postcss`
- `cn()` utility combines `clsx` + `tailwind-merge` for class merging
- ESLint uses flat config (v9 style) with `eslint-plugin-only-warn`
