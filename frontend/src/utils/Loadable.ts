type LoadableState<T> =
  | { state: "loading"; value?: undefined; error?: undefined }
  | { state: "success"; value: T; error?: undefined }
  | { state: "error"; value?: undefined; error: unknown };

export class Loadable<T> {
  promise: Promise<T>;
  state: LoadableState<T>;

  constructor(promise: Promise<T>) {
    this.promise = promise;
    this.state = { state: "loading" };
    promise.then(
      (value) => {
        this.state = { state: "success", value };
      },
      (error: unknown) => {
        this.state = { state: "error", error };
      }
    );
  }
}

export function useLoadable<T>(
  loadable: Loadable<T>
):
  | { state: "success"; value: T; error?: undefined }
  | { state: "error"; value?: undefined; error: unknown } {
  if (loadable.state.state === "loading") {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw loadable.promise;
  }
  return loadable.state;
}
