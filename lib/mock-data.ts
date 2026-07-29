/**
 * Builder + catalog constants.
 * Full product lists come from Excel via `npm run catalog:import`
 * → lib/generated/catalog-data.ts
 */

import type { Bottle } from "./types";
import {
  ALCOHOL_OPTIONS,
  BOTTLES as RAW_BOTTLES,
  DEFAULT_BUILD_ALCOHOL,
  FRAGRANCES,
  GIFT_WRAP_FEE,
  HOUSES,
  OLFACTIVE_GROUPS,
} from "./generated/catalog-data";

export {
  ALCOHOL_OPTIONS,
  DEFAULT_BUILD_ALCOHOL,
  FRAGRANCES,
  GIFT_WRAP_FEE,
  HOUSES,
  OLFACTIVE_GROUPS,
};

/**
 * Excel codes can repeat; duplicate React keys break size/filter re-renders.
 * Deduplicate at the boundary until the next catalog:import regenerates unique IDs.
 */
function withUniqueBottleIds(bottles: Bottle[]): Bottle[] {
  const seen = new Set<string>();
  return bottles.map((b) => {
    let id = b.id;
    if (seen.has(id)) {
      id = `${b.id}-${b.capacityMl}`;
    }
    if (seen.has(id)) {
      let n = 2;
      while (seen.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    seen.add(id);
    return id === b.id ? b : { ...b, id };
  });
}

export const BOTTLES: Bottle[] = withUniqueBottleIds(RAW_BOTTLES);
