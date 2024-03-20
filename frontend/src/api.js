const API_URL = import.meta.env.PUBLIC_SEARCH_API_URL;

/**
 * @typedef WarmupResponse
 * @property {number} dumpTime
 * @property {number} numItems
 * @property {string} v
 */

/** @return {Promise<WarmupResponse>} */
export async function callApiWarmup() {
  const response = await fetch(new URL("warmup", API_URL), {
    method: "POST",
  });
  if (!response.ok) {
    const text = await response.text().catch((err) => String(err));
    throw new Error(`server warmup error: ${text}`);
  }
  return await response.json();
}

/**
 * @typedef SearchResult
 * @property {string} name
 * @property {number} distance
 */
/** @typedef {SearchResult[]} SearchResponse */

/**
 * @param {string} v
 * @param {string} query
 * @return {Promise<SearchResponse>}
 */
export async function callApiSearch(v, query) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      v,
      query,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch((err) => String(err));
    throw new Error(`search error: ${text}`);
  }
  return response.json();
}
