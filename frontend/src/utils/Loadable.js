/**
 * @template T
 * @typedef {(
 *   | { state: "loading"; value?: undefined; error?: undefined }
 *   | { state: "success"; value: T; error?: undefined }
 *   | { state: "error"; value?: undefined; error: unknown }
 * )} LoadableState
 */

/**
 * @template T
 */
export class Loadable {
  /** @type {Promise<T>} */
  promise;
  /** @type {LoadableState<T>} */
  state;

  /**
   * @param {Promise<T>} promise
   */
  constructor(promise) {
    this.promise = promise;
    this.state = { state: "loading" };
    promise.then(
      (value) => {
        this.state = { state: "success", value };
      },
      (error) => {
        this.state = { state: "error", error };
      }
    );
  }
}

/**
 * @template T
 * @param {Loadable<T>} loadable
 * @returns {(
 *   | { state: "success"; value: T; error?: undefined }
 *   | { state: "error"; value?: undefined; error: unknown }
 * )}
 */
export function useLoadable(loadable) {
  if (loadable.state.state === "loading") {
    throw loadable.promise;
  }
  return loadable.state;
}
