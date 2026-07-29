/**
 * Apply olfactive-family + unisex overrides from
 * scripts/catalog/data/olfactive-classification.json
 * (source: Clasificacion_Perfumes_Familia_Olfativa.xlsx).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { mapOlfactiveGroup, type OlfactiveGroupId } from "./sheet-maps";

export type GenderId = "dama" | "caballero" | "unisex";

type ClassRow = {
  contratipo: string;
  casa?: string | null;
  familia: string;
  lista?: string | null;
};

type ClassificationFile = {
  DAMA: ClassRow[];
  HOMBRE: ClassRow[];
  UNISEX: ClassRow[];
};

/** Known spelling mismatches between classification sheet and price list. */
const NAME_ALIASES: Record<string, string> = {
  khamrah: "khamrad",
  "jean marie farina": "jean marie farine",
  "silver mountain water": "silver mountain",
  "ck one": "ck one",
};

export function normalizeFragranceKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/["'`´]/g, "")
    .replace(/[()]/g, " ")
    .replace(/\bunisex\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadClassification(root?: string): ClassificationFile {
  const path = resolve(
    root ?? process.cwd(),
    "scripts",
    "catalog",
    "data",
    "olfactive-classification.json"
  );
  if (!existsSync(path)) {
    throw new Error(`Missing olfactive classification file: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as ClassificationFile;
}

function candidateKeys(contratipo: string): string[] {
  const base = normalizeFragranceKey(contratipo);
  const aliased = NAME_ALIASES[base];
  const keys = new Set<string>([base]);
  if (aliased) keys.add(normalizeFragranceKey(aliased));
  // Drop trailing WATER / FOR HER etc. soft variants for matching
  const stripped = base
    .replace(/\bwater\b$/, "")
    .replace(/\bfor her\b$/, "")
    .replace(/\bfor men\b$/, "")
    .replace(/\bpour homme\b$/, "")
    .trim();
  if (stripped) keys.add(stripped);
  return [...keys];
}

function buildGroupIndex(file: ClassificationFile): Map<string, OlfactiveGroupId> {
  const map = new Map<string, OlfactiveGroupId>();
  const add = (gender: "dama" | "caballero", rows: ClassRow[]) => {
    for (const row of rows) {
      if (!row.contratipo || !row.familia) continue;
      const group = mapOlfactiveGroup(row.familia);
      for (const key of candidateKeys(row.contratipo)) {
        map.set(`${gender}:${key}`, group);
      }
    }
  };
  add("dama", file.DAMA);
  add("caballero", file.HOMBRE);
  return map;
}

function buildUnisexIndex(file: ClassificationFile): Map<string, OlfactiveGroupId> {
  const map = new Map<string, OlfactiveGroupId>();
  for (const row of file.UNISEX) {
    if (!row.contratipo) continue;
    const group = mapOlfactiveGroup(row.familia);
    const lista =
      row.lista?.toUpperCase() === "DAMA"
        ? "dama"
        : row.lista?.toUpperCase() === "HOMBRE"
          ? "caballero"
          : null;
    for (const key of candidateKeys(row.contratipo)) {
      map.set(key, group);
      if (lista) map.set(`${lista}:${key}`, group);
    }
  }
  return map;
}

function lookupGroup(
  index: Map<string, OlfactiveGroupId>,
  gender: "dama" | "caballero",
  contratipo: string
): OlfactiveGroupId | undefined {
  for (const key of candidateKeys(contratipo)) {
    const hit = index.get(`${gender}:${key}`);
    if (hit) return hit;
  }
  return undefined;
}

function isUnisexMatch(
  unisexIndex: Map<string, OlfactiveGroupId>,
  gender: "dama" | "caballero",
  contratipo: string
): { group: OlfactiveGroupId } | undefined {
  // Prefer gender-scoped keys from the UNISEX "LISTA ACTUAL" column so we
  // only flip the row that lives on DAMA or HOMBRE, not a same-name twin.
  for (const key of candidateKeys(contratipo)) {
    const scoped = unisexIndex.get(`${gender}:${key}`);
    if (scoped) return { group: scoped };
  }
  const nameKeys = candidateKeys(contratipo);
  for (const [indexed, group] of unisexIndex) {
    if (!indexed.startsWith(`${gender}:`)) continue;
    const indexedKey = indexed.slice(gender.length + 1);
    for (const nk of nameKeys) {
      if (nk === indexedKey) return { group };
      // Allow longer names to absorb sheet abbreviations (e.g. SILVER MOUNTAIN WATER)
      if (nk.length >= 8 && indexedKey.length >= 5) {
        if (nk.includes(indexedKey) || indexedKey.includes(nk)) return { group };
      }
    }
  }
  return undefined;
}

export type FragranceLike = {
  contratipo: string;
  gender: GenderId;
  group: string;
};

export type OverrideStats = {
  groupChanged: number;
  genderToUnisex: number;
  unmatched: number;
  total: number;
};

/**
 * Mutates fragrances in place: group from DAMA/HOMBRE sheets, gender → unisex
 * when listed on the UNISEX sheet.
 */
export function applyOlfactiveOverrides<T extends FragranceLike>(
  fragrances: T[],
  opts?: { root?: string }
): OverrideStats {
  const file = loadClassification(opts?.root);
  const groupIndex = buildGroupIndex(file);
  const unisexIndex = buildUnisexIndex(file);

  let groupChanged = 0;
  let genderToUnisex = 0;
  let unmatched = 0;

  for (const f of fragrances) {
    const listGender: "dama" | "caballero" =
      f.gender === "dama" || f.gender === "caballero" ? f.gender : "caballero";

    const fromSheet = lookupGroup(groupIndex, listGender, f.contratipo);
    const unisex = isUnisexMatch(unisexIndex, listGender, f.contratipo);

    const nextGroup = unisex?.group ?? fromSheet;
    if (nextGroup) {
      if (nextGroup !== f.group) groupChanged++;
      f.group = nextGroup;
    } else {
      unmatched++;
    }

    if (unisex && f.gender !== "unisex") {
      f.gender = "unisex";
      genderToUnisex++;
    }
  }

  return {
    groupChanged,
    genderToUnisex,
    unmatched,
    total: fragrances.length,
  };
}

/** Sync catalog essence products' metadata/tags from fragrance slices. */
export function syncEssenceCatalogFromFragrances<
  F extends { id: string; gender: GenderId; group: string; contratipo: string },
  P extends {
    id: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  },
>(fragrances: F[], products: P[]): number {
  const byId = new Map(fragrances.map((f) => [f.id, f]));
  let updated = 0;
  for (const p of products) {
    const f = byId.get(p.id);
    if (!f) continue;
    const meta = { ...(p.metadata ?? {}) };
    const prevGender = meta.gender;
    const prevGroup = meta.group;
    meta.gender = f.gender;
    meta.group = f.group;
    p.metadata = meta;
    const tags = new Set(p.tags ?? []);
    tags.delete("dama");
    tags.delete("caballero");
    tags.delete("unisex");
    tags.add(f.gender);
    p.tags = [...tags];
    if (prevGender !== f.gender || prevGroup !== f.group) updated++;
  }
  return updated;
}
