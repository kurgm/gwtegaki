import style from "./Canvas.module.css";

/**
 * @typedef {import("gwtegaki-model").Stroke} Stroke
 */
/**
 * @typedef CanvasProps
 * @property {React.Ref<SVGSVGElement>=} rootRef
 * @property {Stroke[]} strokes
 * @property {(evt: React.MouseEvent | React.TouchEvent) => void} onMouseDown
 */
/**
 * @param {CanvasProps} props
 */
export default function Canvas({ rootRef, strokes, onMouseDown }) {
  return (
    <svg
      ref={rootRef}
      className={style.area}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
      <path
        d="
          M 90 100 H 110 M 100 90 V 110
          M 12 22 V 12 H 22
          M 178 12 H 188 V 22
          M 188 178 V 188 H 178
          M 22 188 H 12 V 178
        "
        fill="none"
        stroke="rgba(120,120,120,.5)"
        strokeWidth="1"
      />
      {strokes.map((stroke, i) => (
        <polyline
          key={i}
          points={stroke.map((p) => `${p[0]},${p[1]}`).join(" ")}
          fill="none"
          stroke="black"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
