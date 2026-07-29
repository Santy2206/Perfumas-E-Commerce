import type { CatalogProduct } from "./catalog-types";
import { normalizeText } from "./house-groups";

export type InsumosCat = "esencias" | "envases" | "alcohol" | "feromonas" | "todos";

/** Resolve tab membership from category + product_kind + title. */
export function productMatchesInsumosCat(
  p: CatalogProduct,
  cat: InsumosCat
): boolean {
  if (cat === "todos") return true;

  const kind = String(p.metadata?.product_kind ?? "")
    .toLowerCase()
    .trim();
  const category = String(p.category ?? "")
    .toLowerCase()
    .trim();
  const title = normalizeText(p.title);

  switch (cat) {
    case "esencias":
      if (category === "envases" || kind === "bottle") return false;
      if (category === "alcohol" || kind === "alcohol") return false;
      if (category === "feromonas" || kind === "pheromone") return false;
      return kind === "essence" || category === "esencias";
    case "envases":
      if (kind === "essence" || category === "esencias") return false;
      if (kind === "alcohol" || category === "alcohol" || /alcohol|desodoriz/.test(title))
        return false;
      if (kind === "pheromone" || category === "feromonas" || /feromon/.test(title))
        return false;
      return kind === "bottle" || category === "envases";
    case "alcohol":
      // Strict: alcohol liquids only — never empty bottles / packaging SKUs.
      if (kind === "bottle" || category === "envases") return false;
      if (/envase|atomizador|perfumero|bala /.test(title)) return false;
      return (
        (kind === "alcohol" || category === "alcohol") && /alcohol|desodoriz/.test(title)
      );
    case "feromonas":
      if (kind === "bottle" || category === "envases") return false;
      if (/envase|atomizador|perfumero|bala /.test(title)) return false;
      return (
        (kind === "pheromone" || category === "feromonas") && /feromon|pheromone/.test(title)
      );
    default:
      return false;
  }
}

export function partitionInsumosProducts(products: CatalogProduct[]) {
  return {
    esencias: products.filter((p) => productMatchesInsumosCat(p, "esencias")),
    envases: products.filter((p) => productMatchesInsumosCat(p, "envases")),
    alcohol: products.filter((p) => productMatchesInsumosCat(p, "alcohol")),
    feromonas: products.filter((p) => productMatchesInsumosCat(p, "feromonas")),
    todos: products,
  };
}
