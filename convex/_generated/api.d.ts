/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_priceOracle from "../actions/priceOracle.js";
import type * as analytics from "../analytics.js";
import type * as crud from "../crud.js";
import type * as follows from "../follows.js";
import type * as listingOracleInternal from "../listingOracleInternal.js";
import type * as listings from "../listings.js";
import type * as marketSync from "../marketSync.js";
import type * as messages from "../messages.js";
import type * as orders from "../orders.js";
import type * as ratings from "../ratings.js";
import type * as savedOwners from "../savedOwners.js";
import type * as users from "../users.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/priceOracle": typeof actions_priceOracle;
  analytics: typeof analytics;
  crud: typeof crud;
  follows: typeof follows;
  listingOracleInternal: typeof listingOracleInternal;
  listings: typeof listings;
  marketSync: typeof marketSync;
  messages: typeof messages;
  orders: typeof orders;
  ratings: typeof ratings;
  savedOwners: typeof savedOwners;
  users: typeof users;
  wishlist: typeof wishlist;
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
