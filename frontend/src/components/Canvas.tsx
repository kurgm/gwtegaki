import { useCallback, useEffect, useRef, useState } from "react";

import type { Point, Stroke } from "gwtegaki-model";

import style from "./Canvas.module.css";

interface CanvasProps {
  strokes: Stroke[];
  commitStroke: (stroke: Stroke) => void;
}
export default function Canvas({ strokes, commitStroke }: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const [currentStroke, setCurrentStroke] = useState<Stroke | undefined>(
    undefined
  );
  const startStrokeEventHandler = useCallback(
    (evt: React.MouseEvent | React.TouchEvent) => {
      if (!svgRef.current) return;
      const newStroke = [getCoordFromEvent(evt, svgRef.current)];
      setCurrentStroke(newStroke);
    },
    []
  );
  const continueStrokeEventHandler = useCallback(
    (evt: MouseEvent | TouchEvent) => {
      setCurrentStroke((stroke) => {
        if (!svgRef.current) return;
        const point = getCoordFromEvent(evt, svgRef.current);
        return stroke?.concat([point]);
      });
    },
    []
  );
  useEffect(() => {
    document.addEventListener("mousemove", continueStrokeEventHandler, {
      passive: true,
    });
    document.addEventListener("touchmove", continueStrokeEventHandler, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousemove", continueStrokeEventHandler);
      document.removeEventListener("touchmove", continueStrokeEventHandler);
    };
  }, [continueStrokeEventHandler]);

  const endStrokeEventHandler = useCallback(() => {
    if (!currentStroke) return;
    commitStroke(currentStroke);
    setCurrentStroke(undefined);
  }, [currentStroke, commitStroke]);
  useEffect(() => {
    document.addEventListener("mouseup", endStrokeEventHandler, {
      passive: true,
    });
    document.addEventListener("touchend", endStrokeEventHandler, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mouseup", endStrokeEventHandler);
      document.removeEventListener("touchend", endStrokeEventHandler);
    };
  }, [endStrokeEventHandler]);

  const visibleStrokes = currentStroke
    ? strokes.concat([currentStroke])
    : strokes;
  return (
    <svg
      ref={svgRef}
      className={style.area}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      onMouseDown={startStrokeEventHandler}
      onTouchStart={startStrokeEventHandler}
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
      {visibleStrokes.map((stroke, i) => (
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

function getCoordFromEvent(
  evt: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent,
  canvasElement: Element
): Point {
  const rect = canvasElement.getBoundingClientRect();
  const { clientX, clientY } = "touches" in evt ? evt.touches[0] : evt;
  const x = Math.round(
    ((clientX - rect.left) / (rect.right - rect.left)) * 200
  );
  const y = Math.round(((clientY - rect.top) / (rect.bottom - rect.top)) * 200);
  return [x, y];
}

export type { Point, Stroke };
