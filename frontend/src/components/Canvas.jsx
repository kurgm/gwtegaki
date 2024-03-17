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
      id="area"
      width="200"
      height="200"
      viewBox="0 0 200 200"
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
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
