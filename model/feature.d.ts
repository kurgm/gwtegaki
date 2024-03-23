export type Point = [number, number];
export type Stroke = Point[];
export function strokes_to_feature_array(strokes: Stroke[]): number[];
export const FEATURE_COLSIZE: number;
export const modelVersion: string;
