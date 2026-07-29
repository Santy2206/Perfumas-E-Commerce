/**
 * House (casa) grouping helpers for catalog filters.
 */

export type HouseGroup = {
  id: string;
  label: string;
  houses: string[];
};

const BANDS: { id: string; label: string; test: (ch: string) => boolean }[] = [
  { id: "a-c", label: "A – C", test: (c) => c >= "a" && c <= "c" },
  { id: "d-g", label: "D – G", test: (c) => c >= "d" && c <= "g" },
  { id: "h-l", label: "H – L", test: (c) => c >= "h" && c <= "l" },
  { id: "m-p", label: "M – P", test: (c) => c >= "m" && c <= "p" },
  { id: "q-t", label: "Q – T", test: (c) => c >= "q" && c <= "t" },
  { id: "u-z", label: "U – Z", test: (c) => c >= "u" && c <= "z" },
];

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function housesMatch(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}

export function textIncludes(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return normalizeText(haystack).includes(normalizeText(needle));
}

/** Group sorted house names into A–C … U–Z accordion bands. */
export function groupHouses(houses: string[]): HouseGroup[] {
  const unique = Array.from(
    new Map(houses.filter(Boolean).map((h) => [normalizeText(h), h])).values()
  ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  return BANDS.map((band) => ({
    id: band.id,
    label: band.label,
    houses: unique.filter((h) => {
      const ch = normalizeText(h).charAt(0);
      return band.test(ch);
    }),
  })).filter((g) => g.houses.length > 0);
}

export type CatalogSort =
  | "alpha-asc"
  | "alpha-desc"
  | "price-asc"
  | "price-desc";

export const CATALOG_SORT_OPTIONS: { id: CatalogSort; label: string }[] = [
  { id: "alpha-asc", label: "A → Z" },
  { id: "alpha-desc", label: "Z → A" },
  { id: "price-asc", label: "Precio ↑" },
  { id: "price-desc", label: "Precio ↓" },
];

export function sortByTitleAndPrice<T extends { title: string; price: number }>(
  items: T[],
  sort: CatalogSort
): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "alpha-desc":
        return b.title.localeCompare(a.title, "es", { sensitivity: "base" });
      case "price-asc":
        return a.price - b.price || a.title.localeCompare(b.title, "es");
      case "price-desc":
        return b.price - a.price || a.title.localeCompare(b.title, "es");
      case "alpha-asc":
      default:
        return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
    }
  });
  return copy;
}
