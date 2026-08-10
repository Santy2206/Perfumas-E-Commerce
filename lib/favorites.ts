/**
 * Customer favorites: Me gusta + named lists (stored in Medusa customer.metadata).
 */

import type { BuildPayload } from "./build-pricing";

export type FavoriteSkuItem = {
  kind: "sku";
  productId: string;
  productKind?: string;
  title?: string;
  handle?: string;
};

export type FavoriteBuildItem = {
  kind: "custom_build";
  id: string;
  build: BuildPayload;
  title: string;
};

export type FavoriteItem = FavoriteSkuItem | FavoriteBuildItem;

export type UserList = {
  id: string;
  name: string;
  items: FavoriteItem[];
};

export type FavoritesData = {
  likes: FavoriteItem[];
  lists: UserList[];
};

export const EMPTY_FAVORITES: FavoritesData = { likes: [], lists: [] };

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseFavorites(meta: Record<string, unknown> | null | undefined): FavoritesData {
  const likes = Array.isArray(meta?.likes)
    ? (meta!.likes as unknown[]).map(parseFavoriteItem).filter(Boolean) as FavoriteItem[]
    : [];
  const lists = Array.isArray(meta?.lists)
    ? (meta!.lists as unknown[])
        .map(parseUserList)
        .filter(Boolean) as UserList[]
    : [];
  return { likes, lists };
}

function parseFavoriteItem(raw: unknown): FavoriteItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.kind === "sku" && typeof o.productId === "string") {
    return {
      kind: "sku",
      productId: o.productId,
      productKind: typeof o.productKind === "string" ? o.productKind : undefined,
      title: typeof o.title === "string" ? o.title : undefined,
      handle: typeof o.handle === "string" ? o.handle : undefined,
    };
  }
  if (o.kind === "custom_build" && o.build && typeof o.build === "object") {
    const build = o.build as BuildPayload;
    if (!build.fragranceId || !build.bottleId) return null;
    return {
      kind: "custom_build",
      id: typeof o.id === "string" ? o.id : newId("build"),
      build,
      title: typeof o.title === "string" ? o.title : "Creación guardada",
    };
  }
  return null;
}

function parseUserList(raw: unknown): UserList | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  const items = Array.isArray(o.items)
    ? (o.items as unknown[]).map(parseFavoriteItem).filter(Boolean) as FavoriteItem[]
    : [];
  return { id: o.id, name: o.name, items };
}

export function skuItem(input: {
  productId: string;
  productKind?: string;
  title?: string;
  handle?: string;
}): FavoriteSkuItem {
  return {
    kind: "sku",
    productId: input.productId,
    productKind: input.productKind,
    title: input.title,
    handle: input.handle,
  };
}

export function buildItem(build: BuildPayload, title: string): FavoriteBuildItem {
  return {
    kind: "custom_build",
    id: newId("build"),
    build,
    title,
  };
}

export function itemKey(item: FavoriteItem): string {
  if (item.kind === "sku") return `sku:${item.productId}`;
  return `build:${item.id}:${item.build.fragranceId}:${item.build.bottleId}`;
}

export function sameItem(a: FavoriteItem, b: FavoriteItem): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "sku" && b.kind === "sku") return a.productId === b.productId;
  if (a.kind === "custom_build" && b.kind === "custom_build") {
    return (
      a.build.fragranceId === b.build.fragranceId &&
      a.build.bottleId === b.build.bottleId &&
      JSON.stringify(a.build.pheromoneIds || []) ===
        JSON.stringify(b.build.pheromoneIds || []) &&
      Boolean(a.build.giftWrap) === Boolean(b.build.giftWrap)
    );
  }
  return false;
}

export function isSkuLiked(likes: FavoriteItem[], productId: string): boolean {
  return likes.some((i) => i.kind === "sku" && i.productId === productId);
}

/** Upgrade kind on an existing like when the user likes again with a more specific context. */
export function upsertSkuLike(
  likes: FavoriteItem[],
  item: FavoriteSkuItem
): FavoriteItem[] {
  const idx = likes.findIndex(
    (i) => i.kind === "sku" && i.productId === item.productId
  );
  if (idx === -1) return [...likes, item];
  const prev = likes[idx] as FavoriteSkuItem;
  const next = [...likes];
  next[idx] = {
    ...prev,
    ...item,
    // Keep a more specific / intentional kind if provided
    productKind: item.productKind || prev.productKind,
  };
  return next;
}

export function isSkuInAnyList(lists: UserList[], productId: string): boolean {
  return lists.some((l) =>
    l.items.some((i) => i.kind === "sku" && i.productId === productId)
  );
}

export function isSkuInList(
  lists: UserList[],
  listId: string,
  productId: string
): boolean {
  const list = lists.find((l) => l.id === listId);
  if (!list) return false;
  return list.items.some((i) => i.kind === "sku" && i.productId === productId);
}

export function likedSkuIds(likes: FavoriteItem[]): Set<string> {
  return new Set(
    likes.filter((i): i is FavoriteSkuItem => i.kind === "sku").map((i) => i.productId)
  );
}

export function listSkuIds(lists: UserList[], listId?: string | "any"): Set<string> {
  const ids = new Set<string>();
  for (const list of lists) {
    if (listId && listId !== "any" && list.id !== listId) continue;
    for (const item of list.items) {
      if (item.kind === "sku") ids.add(item.productId);
    }
  }
  return ids;
}

export function toggleLikeInData(
  data: FavoritesData,
  item: FavoriteItem
): FavoritesData {
  const exists = data.likes.some((i) => sameItem(i, item));
  return {
    ...data,
    likes: exists
      ? data.likes.filter((i) => !sameItem(i, item))
      : [...data.likes, item],
  };
}

export function createListInData(data: FavoritesData, name: string): FavoritesData {
  const trimmed = name.trim();
  if (!trimmed) return data;
  return {
    ...data,
    lists: [
      ...data.lists,
      { id: newId("list"), name: trimmed, items: [] },
    ],
  };
}

export function renameListInData(
  data: FavoritesData,
  listId: string,
  name: string
): FavoritesData {
  const trimmed = name.trim();
  if (!trimmed) return data;
  return {
    ...data,
    lists: data.lists.map((l) =>
      l.id === listId ? { ...l, name: trimmed } : l
    ),
  };
}

export function deleteListInData(data: FavoritesData, listId: string): FavoritesData {
  return {
    ...data,
    lists: data.lists.filter((l) => l.id !== listId),
  };
}

export function addToListInData(
  data: FavoritesData,
  listId: string,
  item: FavoriteItem
): FavoritesData {
  return {
    ...data,
    lists: data.lists.map((l) => {
      if (l.id !== listId) return l;
      if (l.items.some((i) => sameItem(i, item))) return l;
      return { ...l, items: [...l.items, item] };
    }),
  };
}

export function removeFromListInData(
  data: FavoritesData,
  listId: string,
  item: FavoriteItem
): FavoritesData {
  return {
    ...data,
    lists: data.lists.map((l) =>
      l.id === listId
        ? { ...l, items: l.items.filter((i) => !sameItem(i, item)) }
        : l
    ),
  };
}

export function removeLikeInData(
  data: FavoritesData,
  item: FavoriteItem
): FavoritesData {
  return {
    ...data,
    likes: data.likes.filter((i) => !sameItem(i, item)),
  };
}

export function productKindLabel(kind?: string): string {
  switch (kind) {
    case "prepared_replica":
      return "Perfume preparado";
    case "essence":
      return "Esencia";
    case "bottle":
      return "Envase";
    case "alcohol":
      return "Alcohol";
    case "pheromone":
      return "Feromona";
    case "custom_build":
      return "Creación personalizada";
    default:
      return "Producto";
  }
}
