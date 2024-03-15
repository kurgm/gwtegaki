declare module 'annoy' {
  // https://github.com/jimkang/annoy-node/blob/master/annoyindexwrapper.cc
  namespace Annoy {
    export type Metric = "Angular" | "Manhattan";
    export interface ResultObject {
      neighbors: number[];
      distances: number[];
    }
    export class Annoy {
      constructor(dimension?: number, metric?: Metric);
      constructor(dimension?: number, metric?: string);
      addItem(index: number, vec: number[]): void;
      build(numberOfTrees?: number): void;
      save(str: string): boolean;
      load(str: string): boolean;
      unload(): void;
      getItem(index: number): number[];
      getNNsByVector(vec: number[], numberOfNeighbors?: number, searchK?: number, includeDistances?: false): number[];
      getNNsByVector(vec: number[], numberOfNeighbors?: number, searchK?: number, includeDistances: true): ResultObject;
      getNNsByVector(vec: number[], numberOfNeighbors?: number, searchK?: number, includeDistances: boolean): number[] | ResultObject;
      getNNsByItem(index: number, numberOfNeighbors?: number, searchK?: number, includeDistances?: false): number[];
      getNNsByItem(index: number, numberOfNeighbors?: number, searchK?: number, includeDistances: true): ResultObject;
      getNNsByItem(index: number, numberOfNeighbors?: number, searchK?: number, includeDistances: boolean): number[] | ResultObject;
      getNItems(): number;
      getDistance(indexA: number, indexB: number): number;
    }
  }
  export = Annoy.Annoy;
}
