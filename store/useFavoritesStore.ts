"use client";

import { create } from "zustand";
import {
  getCustomerFavorites,
  saveCustomerFavorites,
} from "../lib/auth";
import type { BuildPayload } from "../lib/build-pricing";
import {
  EMPTY_FAVORITES,
  addToListInData,
  buildItem,
  createListInData,
  deleteListInData,
  isSkuInAnyList,
  isSkuInList,
  isSkuLiked,
  removeFromListInData,
  removeLikeInData,
  renameListInData,
  sameItem,
  skuItem,
  toggleLikeInData,
  type FavoriteItem,
  type FavoritesData,
  type UserList,
} from "../lib/favorites";

type FavoritesStore = {
  likes: FavoriteItem[];
  lists: UserList[];
  hydrated: boolean;
  saving: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  reset: () => void;
  toggleSkuLike: (input: {
    productId: string;
    productKind?: string;
    title?: string;
    handle?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  toggleBuildLike: (
    build: BuildPayload,
    title: string
  ) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  saveBuildLike: (
    build: BuildPayload,
    title: string
  ) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  createList: (
    name: string
  ) => Promise<
    | { ok: true; listId: string }
    | { ok: false; error: string; needAuth?: boolean }
  >;
  renameList: (
    listId: string,
    name: string
  ) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  deleteList: (
    listId: string
  ) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  addSkuToList: (
    listId: string,
    input: {
      productId: string;
      productKind?: string;
      title?: string;
      handle?: string;
    }
  ) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  addBuildToList: (
    listId: string,
    build: BuildPayload,
    title: string
  ) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  removeFromList: (
    listId: string,
    item: FavoriteItem
  ) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  removeLike: (
    item: FavoriteItem
  ) => Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }>;
  isLikedSku: (productId: string) => boolean;
  isInAnyListSku: (productId: string) => boolean;
  isInListSku: (listId: string, productId: string) => boolean;
};

function dataOf(state: { likes: FavoriteItem[]; lists: UserList[] }): FavoritesData {
  return { likes: state.likes, lists: state.lists };
}

async function persist(
  set: (partial: Partial<FavoritesStore>) => void,
  get: () => FavoritesStore,
  next: FavoritesData
): Promise<{ ok: true } | { ok: false; error: string; needAuth?: boolean }> {
  const prev = dataOf(get());
  set({ likes: next.likes, lists: next.lists, saving: true, error: null });
  const result = await saveCustomerFavorites(next);
  if (!result.ok) {
    set({
      likes: prev.likes,
      lists: prev.lists,
      saving: false,
      error: result.error,
    });
    const needAuth = /sesión|iniciar|cuenta/i.test(result.error);
    return { ok: false, error: result.error, needAuth };
  }
  set({ saving: false });
  return { ok: true };
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  likes: [],
  lists: [],
  hydrated: false,
  saving: false,
  error: null,

  hydrate: async () => {
    // Avoid overwriting an in-flight Quitar / like with stale server data
    if (get().saving) return;
    const data = await getCustomerFavorites();
    if (get().saving) return;
    set({
      likes: data.likes,
      lists: data.lists,
      hydrated: true,
      error: null,
    });
  },

  reset: () =>
    set({
      ...EMPTY_FAVORITES,
      hydrated: true,
      saving: false,
      error: null,
    }),

  toggleSkuLike: async (input) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return {
        ok: false,
        error: "Inicia sesión para guardar me gusta.",
        needAuth: true,
      };
    }
    const item = skuItem(input);
    const data = dataOf(get());
    const existing = data.likes.find(
      (i) => i.kind === "sku" && i.productId === item.productId
    );
    // If already liked with a different kind (e.g. prepared_replica → bottle
    // from builder step 2), update the kind instead of removing.
    if (
      existing &&
      existing.kind === "sku" &&
      item.productKind &&
      existing.productKind !== item.productKind
    ) {
      return persist(set, get, {
        ...data,
        likes: data.likes.map((i) =>
          i.kind === "sku" && i.productId === item.productId
            ? { ...i, ...item }
            : i
        ),
      });
    }
    return persist(set, get, toggleLikeInData(data, item));
  },

  toggleBuildLike: async (build, title) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return {
        ok: false,
        error: "Inicia sesión para guardar me gusta.",
        needAuth: true,
      };
    }
    const item = buildItem(build, title);
    return persist(set, get, toggleLikeInData(dataOf(get()), item));
  },

  saveBuildLike: async (build, title) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return {
        ok: false,
        error: "Inicia sesión para guardar me gusta.",
        needAuth: true,
      };
    }
    const item = buildItem(build, title);
    const data = dataOf(get());
    if (data.likes.some((i) => sameItem(i, item))) {
      return { ok: true };
    }
    return persist(set, get, {
      ...data,
      likes: [...data.likes, item],
    });
  },

  createList: async (name) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return {
        ok: false,
        error: "Inicia sesión para crear listas.",
        needAuth: true,
      };
    }
    const next = createListInData(dataOf(get()), name);
    const created = next.lists[next.lists.length - 1];
    const result = await persist(set, get, next);
    if (!result.ok) return result;
    return { ok: true, listId: created.id };
  },

  renameList: async (listId, name) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return { ok: false, error: "Inicia sesión.", needAuth: true };
    }
    return persist(set, get, renameListInData(dataOf(get()), listId, name));
  },

  deleteList: async (listId) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return { ok: false, error: "Inicia sesión.", needAuth: true };
    }
    return persist(set, get, deleteListInData(dataOf(get()), listId));
  },

  addSkuToList: async (listId, input) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return {
        ok: false,
        error: "Inicia sesión para añadir a una lista.",
        needAuth: true,
      };
    }
    return persist(
      set,
      get,
      addToListInData(dataOf(get()), listId, skuItem(input))
    );
  },

  addBuildToList: async (listId, build, title) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return {
        ok: false,
        error: "Inicia sesión para añadir a una lista.",
        needAuth: true,
      };
    }
    return persist(
      set,
      get,
      addToListInData(dataOf(get()), listId, buildItem(build, title))
    );
  },

  removeFromList: async (listId, item) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return { ok: false, error: "Inicia sesión.", needAuth: true };
    }
    return persist(set, get, removeFromListInData(dataOf(get()), listId, item));
  },

  removeLike: async (item) => {
    const { useCustomerStore } = await import("./useCustomerStore");
    if (!useCustomerStore.getState().customer) {
      return { ok: false, error: "Inicia sesión.", needAuth: true };
    }
    return persist(set, get, removeLikeInData(dataOf(get()), item));
  },

  isLikedSku: (productId) => isSkuLiked(get().likes, productId),
  isInAnyListSku: (productId) => isSkuInAnyList(get().lists, productId),
  isInListSku: (listId, productId) =>
    isSkuInList(get().lists, listId, productId),
}));
