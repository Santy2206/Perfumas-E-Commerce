import {
  likedSkuIds,
  listSkuIds,
  type FavoriteItem,
  type UserList,
} from "./favorites";
import type { CollectionFilter } from "../components/shop/CollectionFilterChips";

export function matchesCollectionFilter(
  productId: string,
  collection: CollectionFilter,
  likes: FavoriteItem[],
  lists: UserList[]
): boolean {
  if (!collection) return true;
  if (collection === "likes") return likedSkuIds(likes).has(productId);
  if (collection === "any-list") return listSkuIds(lists, "any").has(productId);
  if (collection.startsWith("list:")) {
    return listSkuIds(lists, collection.slice(5)).has(productId);
  }
  return true;
}
