/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAccess from "../adminAccess.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_orgAuth from "../lib/orgAuth.js";
import type * as matches from "../matches.js";
import type * as myFunctions from "../myFunctions.js";
import type * as organizations from "../organizations.js";
import type * as permissions from "../permissions.js";
import type * as roles from "../roles.js";
import type * as scoring from "../scoring.js";
import type * as seed from "../seed.js";
import type * as tournaments from "../tournaments.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAccess: typeof adminAccess;
  auth: typeof auth;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/orgAuth": typeof lib_orgAuth;
  matches: typeof matches;
  myFunctions: typeof myFunctions;
  organizations: typeof organizations;
  permissions: typeof permissions;
  roles: typeof roles;
  scoring: typeof scoring;
  seed: typeof seed;
  tournaments: typeof tournaments;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
