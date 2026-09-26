/** Query param an AP page uses to embed one view: `index.html?interactive=<view-id>`. */
export const EMBED_PARAM = "interactive";

/** Hash key the standalone app keeps its selection in: `index.html#view=<view-id>`. */
export const VIEW_HASH_KEY = "view";

/**
 * The view id to embed, or null when the page is not in embed mode. A present but empty param
 * returns "" so an author's typo shows as an unknown view instead of silently becoming the
 * standalone app.
 */
export function getEmbedViewId(search: string): string | null {
  return new URLSearchParams(search).get(EMBED_PARAM);
}

/** The view id selected in the standalone app's hash, or null when the hash has no view key. */
export function getHashViewId(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, "")).get(VIEW_HASH_KEY);
}

export function viewHash(id: string): string {
  return `#${new URLSearchParams({ [VIEW_HASH_KEY]: id })}`;
}
