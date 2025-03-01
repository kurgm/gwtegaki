import { SEARCH_API_URL as API_URL } from "astro:env/client";

export interface WarmupResponse {
  dumpTime: number;
  numItems: number;
  v: string;
}

export async function callApiWarmup(): Promise<WarmupResponse> {
  const response = await fetch(new URL("warmup", API_URL), {
    method: "POST",
  });
  if (!response.ok) {
    const text = await response.text().catch((err) => String(err));
    throw new Error(`server warmup error: ${text}`);
  }
  return (await response.json()) as WarmupResponse;
}

export interface SearchResult {
  name: string;
  distance: number;
}
export type SearchResponse = SearchResult[];

export async function callApiSearch(
  v: string,
  query: string
): Promise<SearchResponse> {
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
  return (await response.json()) as SearchResponse;
}
