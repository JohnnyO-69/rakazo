import { fetch as undiciFetch } from "undici";

/** The fetch that must drive any `Agent` built from the `undici` package.
 *
 * Node's built-in fetch bundles its own undici, and the two diverge: undici 8
 * only accepts the current handler protocol (`onRequestStart`), so a request
 * from Node's fetch through a package `Agent` fails with "invalid
 * onRequestStart method" before a socket opens. Pairing the package's fetch
 * with its `Agent` keeps both on one version. Callers still inject a fetch
 * for tests and emulators. */
export const dispatcherFetch = undiciFetch as unknown as typeof globalThis.fetch;

/** Node's fetch as this module loaded it. A later replacement of
 * `globalThis.fetch` is a different function; the original is still paired
 * here so a captured builtin is not handed the package Agent. */
const nodeFetch = globalThis.fetch;

/** Package fetch for an `Agent` from this undici.
 *
 * A missing transport, the fetch currently installed as `globalThis.fetch`,
 * and a captured builtin all use `dispatcherFetch`. Any other function is
 * the caller's transport and is returned unchanged. */
export function fetchPairedWithDispatcher(
  baseFetch?: typeof globalThis.fetch,
): typeof globalThis.fetch {
  if (
    baseFetch == null ||
    baseFetch === nodeFetch ||
    baseFetch === globalThis.fetch ||
    baseFetch === dispatcherFetch
  ) {
    return dispatcherFetch;
  }
  return baseFetch;
}
