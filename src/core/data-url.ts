/**
 * Data files are fetched, not imported, so webpack cannot rewrite their URLs.
 * Left relative, a URL resolves against the page, and that is wrong on the
 * released top-level index.html: the page sits at neural-pathways/ while its
 * build, and the data published beside it, live in version/<tag>/. The runtime
 * public path is the build root wherever the page is served from. See
 * doc/deploy.md.
 *
 * Declared here rather than in a global.d.ts because ts-node, which runs
 * scripts/ that import the loader, does not load included declaration files.
 */
declare const __webpack_public_path__: string;

export function dataUrl(baseUrl: string, path: string): string {
  const relative = baseUrl + path;
  // Webpack replaces this typeof at build time, so the bundle always resolves.
  // Under Jest and ts-node the name is undeclared, typeof gives "undefined"
  // (not a ReferenceError), and the URL stays page-relative.
  return typeof __webpack_public_path__ === "string"
    ? new URL(relative, __webpack_public_path__).href
    : relative;
}
