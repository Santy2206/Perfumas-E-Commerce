/**
 * Column maps and label → id helpers for Perfumas Excel price lists.
 */

export type OlfactiveGroupId =
  | "citricas-frescas"
  | "maderas-orientales"
  | "intermedios"
  | "dulces";

const GROUP_ALIASES: Record<string, OlfactiveGroupId> = {
  "citricas y frescas": "citricas-frescas",
  "cítricas y frescas": "citricas-frescas",
  maderas: "maderas-orientales",
  "maderas y orientales": "maderas-orientales",
  intermedios: "intermedios",
  dulces: "dulces",
  "dulces y arabes": "dulces",
  "dulces y árabes": "dulces",
};

export function mapOlfactiveGroup(raw: string | null | undefined): OlfactiveGroupId {
  if (!raw) return "intermedios";
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (key.includes("sin clasificar")) return "intermedios";
  for (const [alias, id] of Object.entries(GROUP_ALIASES)) {
    const a = alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (key === a || key.includes(a) || a.includes(key)) return id;
  }
  if (key.includes("citric")) return "citricas-frescas";
  // Arabes / oud / oriental-gourmand → Dulces y árabes (not Maderas)
  if (key.includes("arabe") || key.includes("oud") || key.includes("oriental")) {
    return "dulces";
  }
  if (key.includes("madera")) return "maderas-orientales";
  if (key.includes("dulce")) return "dulces";
  return "intermedios";
}

export function toHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

export function toNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const s = String(value).replace(/[^\d.-]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function detectBottleTier(name: string): "AAA" | "AA" | "Generico" {
  const u = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  // Perfumeros and explicit genericos are always Genérico
  if (u.includes("PERFUMERO") || u.includes("GENERICO")) return "Generico";
  if (/\bAAA\b/.test(u) || u.endsWith(" AAA") || u.includes(" AAA ")) return "AAA";
  return "AA";
}

export function detectClosure(name: string): "Agrafe" | "Rosca" {
  return name.toUpperCase().includes("AGRAFE") ? "Agrafe" : "Rosca";
}

export function detectCapacityMl(name: string): number {
  const m = name.match(/(\d+)\s*ml/i);
  return m ? Number(m[1]) : 100;
}

export function classifySplashRow(name: string): {
  department: "insumos" | "hogar" | "accesorios";
  category: string;
  product_kind: string;
} {
  const u = name.toUpperCase();
  if (u.includes("ALCOHOL") || u.includes("DESODORIZ")) {
    return { department: "insumos", category: "alcohol", product_kind: "alcohol" };
  }
  if (u.includes("FEROMONA") || u.includes("PHEROMONE")) {
    return { department: "insumos", category: "feromonas", product_kind: "pheromone" };
  }
  if (
    u.includes("SPLASH") ||
    u.includes("CREMA") ||
    u.includes("AROM") ||
    u.includes("AMBIENT") ||
    u.includes("LINOS") ||
    u.includes("SPRAY") ||
    u.includes("GOTERO")
  ) {
    return { department: "hogar", category: "ambientales", product_kind: "home_care" };
  }
  return { department: "hogar", category: "cuidado", product_kind: "home_care" };
}

export const WHOLESALE_FALLBACK = 0.2;
export const DEFAULT_MOQ = 6;
export const ESSENCE_MOQ_G = 30;
export const GIFT_WRAP_FEE = 3000;

export const OLFACTIVE_GROUPS = [
  {
    id: "citricas-frescas" as const,
    label: "Cítricas y Frescas",
    wheelLines: ["Cítricas", "y Frescas"],
  },
  {
    id: "maderas-orientales" as const,
    label: "Maderas",
    wheelLines: ["Maderas"],
  },
  {
    id: "intermedios" as const,
    label: "Intermedios",
    wheelLines: ["Intermedios"],
  },
  {
    id: "dulces" as const,
    label: "Dulces y árabes",
    wheelLines: ["Dulces", "y árabes"],
  },
];
