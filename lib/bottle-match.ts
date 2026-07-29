/**
 * Fuzzy fragrance ↔ replica matching for Crear step 2.
 * Exact id links + name/house similarity (e.g. "1 Million Lucky" → "1 Million").
 */

import { normalizeText } from "./house-groups";
import type { Bottle, Fragrance } from "./types";

const NUMBER_WORDS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
};

const NOISE = new Set([
  "replica",
  "replique",
  "agrafe",
  "rosca",
  "ml",
  "aaa",
  "aa",
  "generico",
  "perfumero",
  "caja",
  "vp",
  "vs",
  "v",
  "s",
  "para",
  "the",
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "and",
  "y",
  "edition",
  "edicion",
  "intense",
  "intensely",
  "absolu",
  "parfum",
  "edt",
  "edp",
]);

function tokenize(raw: string): string[] {
  const n = normalizeText(raw)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => NUMBER_WORDS[t] ?? t)
    .filter((t) => !NOISE.has(t) && (t.length >= 3 || /^\d+$/.test(t)));
  return Array.from(new Set(n));
}

export type BottleMatchKind = "exact" | "similar" | "none";

export type BottleMatch = {
  score: number;
  kind: BottleMatchKind;
  reason?: string;
};

/** Score how well a replica fits the selected fragrance (0–100). */
export function scoreBottleForFragrance(
  bottle: Bottle,
  fragrance: Fragrance
): BottleMatch {
  if (bottle.matchesFragranceIds?.includes(fragrance.id)) {
    return { score: 100, kind: "exact", reason: "Asociada" };
  }

  const bottleTokens = tokenize(bottle.name);
  const fragTokens = tokenize(fragrance.contratipo);
  const houseTokens = tokenize(fragrance.house);

  if (!fragTokens.length && !houseTokens.length) {
    return { score: 0, kind: "none" };
  }

  const bottleSet = new Set(bottleTokens);
  let fragHits = 0;
  for (const t of fragTokens) {
    if (bottleSet.has(t)) {
      fragHits++;
      continue;
    }
    // partial: "million" in "1million" already tokenized; also prefix overlap
    if (
      bottleTokens.some(
        (bt) => bt.startsWith(t) || t.startsWith(bt) || (t.length >= 4 && bt.includes(t))
      )
    ) {
      fragHits += 0.75;
    }
  }

  let houseHits = 0;
  for (const t of houseTokens) {
    if (t.length < 4) continue;
    if (
      bottleSet.has(t) ||
      bottleTokens.some((bt) => bt.includes(t) || t.includes(bt))
    ) {
      houseHits++;
    }
  }

  const fragRatio = fragTokens.length ? fragHits / fragTokens.length : 0;
  let score = 0;
  let reason: string | undefined;

  if (fragRatio >= 0.99 && fragTokens.length >= 1) {
    score = 90;
    reason = "Mismo nombre";
  } else if (fragRatio >= 0.6 && fragHits >= 1) {
    score = 70 + Math.round(fragRatio * 15);
    reason = "Nombre parecido";
  } else if (fragHits >= 1 && fragTokens.some((t) => t.length >= 5 && bottleSet.has(t))) {
    // strong distinctive token (e.g. MILLION)
    score = 65;
    reason = "Nombre parecido";
  } else if (houseHits >= 1 && fragHits >= 1) {
    score = 55;
    reason = "Casa + nombre";
  } else if (houseHits >= 1) {
    score = 35;
    reason = "Misma casa";
  }

  // Boost when bottle contains core multi-word phrase stripped of edition words
  const core = fragTokens.slice(0, 2).join(" ");
  if (core.length >= 4 && normalizeText(bottle.name).includes(core.replace(/\s+/g, " "))) {
    score = Math.max(score, 75);
    reason = reason || "Nombre parecido";
  }

  if (score >= 55) return { score, kind: "similar", reason };
  if (score >= 35) return { score, kind: "similar", reason };
  return { score: 0, kind: "none" };
}

export function isBottleRelatedToFragrance(
  bottle: Bottle,
  fragrance: Fragrance,
  minScore = 55
): boolean {
  return scoreBottleForFragrance(bottle, fragrance).score >= minScore;
}

export function rankBottlesForFragrance(
  bottles: Bottle[],
  fragrance: Fragrance
): { bottle: Bottle; match: BottleMatch }[] {
  return bottles
    .map((bottle) => ({ bottle, match: scoreBottleForFragrance(bottle, fragrance) }))
    .sort((a, b) => {
      if (b.match.score !== a.match.score) return b.match.score - a.match.score;
      if (a.bottle.qualityTier !== b.bottle.qualityTier) {
        const order = ["AAA", "AA", "Generico"] as const;
        return (
          order.indexOf(a.bottle.qualityTier) - order.indexOf(b.bottle.qualityTier)
        );
      }
      return (
        a.bottle.price - b.bottle.price ||
        a.bottle.name.localeCompare(b.bottle.name, "es")
      );
    });
}
