import style from "./Result.module.css";

/**
 * @typedef ResultProps
 * @property {import("../api").SearchResponse | string} result
 * @property {boolean} loading
 */
/**
 * @param {ResultProps} props
 */
export default function Result({ result, loading }) {
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
            <img
              src={`https://glyphwiki.org/glyph/${name}.50px.png`}
              alt={name}
              title={name}
            />
          </a>
        </div>
      ))}
    </div>
  );
}
