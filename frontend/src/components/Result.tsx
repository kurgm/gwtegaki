import type { SearchResponse } from "../api";

import GlyphImage from "./GlyphImage";

import style from "./Result.module.css";

interface ResultProps {
  result: SearchResponse | string;
  loading: boolean;
}

export default function Result({ result, loading }: ResultProps) {
  if (typeof result === "string") {
    return (
      <div className={style.root}>
        <div className={style.message}>{result}</div>
      </div>
    );
  }

  return (
    <div className={style.root} aria-busy={loading}>
      {result.map(({ name }) => (
        <div key={name}>
          <a href={`https://glyphwiki.org/wiki/${name}`}>
            <GlyphImage name={name} />
          </a>
        </div>
      ))}
    </div>
  );
}
