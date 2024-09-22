// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_SEARCH_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
