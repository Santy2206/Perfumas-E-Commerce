import { normalizeText, textIncludes } from "./house-groups";

export type SearchSuggestion = {
  id: string;
  label: string;
  secondary?: string;
  kind: "product" | "house";
  /** Text written into the search field when picked */
  value: string;
};

export type SuggestableItem = {
  id: string;
  title: string;
  subtitle?: string;
};

function rankScore(label: string, query: string): number {
  const nLabel = normalizeText(label);
  const nQuery = normalizeText(query);
  if (!nQuery) return 0;
  if (nLabel === nQuery) return 300;
  if (nLabel.startsWith(nQuery)) return 200;
  if (nLabel.includes(` ${nQuery}`) || nLabel.includes(`-${nQuery}`)) return 150;
  if (nLabel.includes(nQuery)) return 100;
  return 0;
}

/**
 * Build ranked autocomplete suggestions from product titles + optional houses.
 * Case/accent insensitive. Empty query → no suggestions.
 */
export function buildSearchSuggestions(
  query: string,
  items: SuggestableItem[],
  options?: { houses?: string[]; max?: number }
): SearchSuggestion[] {
  const q = query.trim();
  if (!q) return [];
  const max = options?.max ?? 8;
  const out: (SearchSuggestion & { score: number })[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const titleScore = rankScore(item.title, q);
    const subScore = item.subtitle ? rankScore(item.subtitle, q) : 0;
    const score = Math.max(titleScore, subScore * 0.9);
    if (score <= 0 && !textIncludes(item.title, q) && !(item.subtitle && textIncludes(item.subtitle, q))) {
      continue;
    }
    const finalScore =
      score ||
      (textIncludes(item.title, q) || (item.subtitle && textIncludes(item.subtitle, q))
        ? 50
        : 0);
    if (finalScore <= 0) continue;
    const key = `p:${normalizeText(item.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: item.id,
      label: item.title,
      secondary: item.subtitle || undefined,
      kind: "product",
      value: item.title,
      score: finalScore,
    });
  }

  for (const house of options?.houses || []) {
    if (!house.trim()) continue;
    const score = rankScore(house, q) || (textIncludes(house, q) ? 40 : 0);
    if (score <= 0) continue;
    const key = `h:${normalizeText(house)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `house:${key}`,
      label: house,
      secondary: "Casa",
      kind: "house",
      value: house,
      score: score + 10, // slight boost so houses surface early
    });
  }

  out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "es"));
  return out.slice(0, max).map(({ score: _s, ...rest }) => rest);
}
