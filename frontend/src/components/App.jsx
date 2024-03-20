import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

import Result from "./Result";
import Canvas from "./Canvas";
import style from "./App.module.css";
import { Loadable, useLoadable } from "../utils/Loadable";
import { callApiSearch, callApiWarmup } from "../api";

/**
 * @typedef {(
 *   | { type: "beforeInit" }
 *   | { type: "warming" }
 *   | { type: "ready"; error?: string }
 *   | { type: "running" }
 * )} AppState
 */

export default function App() {
  const [appState, setAppState] = useState(
    /** @type {AppState} */ ({ type: "beforeInit" })
  );
  useEffect(() => {
    setAppState({ type: "warming" });
    apiWarmup().then(
      () => {
        setAppState({ type: "ready" });
      },
      (e) => {
        setAppState({ type: "ready", error: String(e) });
      }
    );
  }, []);

  const { strokes, addStroke, clearStrokes, undoStroke } = useStrokeState();

  const commitStroke = useCallback(
    /**
     * @param {import("./Canvas").Stroke} stroke
     */
    (stroke) => {
      setAppState((appState) =>
        appState.type === "ready" ? { type: "running" } : appState
      );
      addStroke(stroke);
    },
    [addStroke]
  );

  const resultLoadable = useSearchResultLoadable(strokes);
  /** @type {string} */
  const fallbackMessage = (() => {
    switch (appState.type) {
      case "beforeInit":
        return "";
      case "warming":
        return "サーバ起動中… (20〜30秒かかることがあります)";
      case "ready":
        if (appState.error) {
          return `サーバ起動エラー: ${appState.error}`;
        }
        return "準備完了";
      case "running":
        if (strokes.length === 0) {
          return "";
        }
        return "検索中…";
    }
  })();

  const [prevLoadable, setPrevLoadable] = useState(resultLoadable);
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    if (resultLoadable !== prevLoadable) {
      startTransition(() => {
        setPrevLoadable(resultLoadable);
      });
    }
  }, [resultLoadable, prevLoadable, startTransition]);
  return (
    <div className={style.root}>
      <div className={style.writing}>
        <Canvas strokes={strokes} commitStroke={commitStroke} />
        <div>
          <button onClick={clearStrokes}>消去</button>
          <button onClick={undoStroke}>戻す</button>
        </div>
      </div>
      <Suspense fallback={<Result result={fallbackMessage} loading={true} />}>
        <LoadResult
          loadable={prevLoadable}
          fallbackMessage={fallbackMessage}
          loading={isPending || appState.type === "warming"}
        />
      </Suspense>
    </div>
  );
}

function useStrokeState() {
  const [strokes, setStrokes] = useState(
    /** @type {import("./Canvas").Stroke[]} */ ([])
  );
  const addStroke = useCallback(
    /**
     * @param {import("./Canvas").Stroke} stroke
     */
    (stroke) => {
      // clone
      stroke = stroke.slice();
      setStrokes((strokes) => strokes.concat([stroke]));
    },
    []
  );
  const clearStrokes = useCallback(() => {
    setStrokes([]);
  }, []);
  const undoStroke = useCallback(() => {
    setStrokes((strokes) => strokes.slice(0, -1));
  }, []);
  return { strokes, addStroke, clearStrokes, undoStroke };
}

const apiWarmup = (() => {
  /** @type {Promise<void>} */
  let promise;
  async function warmup() {
    const meta = await callApiWarmup();
    document.getElementById("meta_dump_time").textContent = `${new Date(
      meta.dumpTime
    ).toLocaleString("ja-JP", { timeZoneName: "short" })}時点で`;
    document.getElementById(
      "meta_nglyphs"
    ).textContent = `のうち${meta.numItems}個`;
  }

  return () => {
    if (!promise) {
      promise = warmup();
    }
    return promise;
  };
})();

const gwtegakiModelPromise = import("gwtegaki-model");
/**
 * @param {import("./Canvas").Stroke[]} strokes
 */
async function searchByStrokes(strokes) {
  const { strokes_to_feature_array, modelVersion } = await gwtegakiModelPromise;
  const feature = strokes_to_feature_array(strokes).map((x) => Math.fround(x));
  const query = feature.join(" ");

  await apiWarmup().catch(() => {});
  return await callApiSearch(modelVersion, query);
}

/** @type {Loadable<undefined>} */
const emptyResultLoadable = new Loadable(Promise.resolve(undefined));

/** @type {WeakMap<import("./Canvas").Stroke, Loadable<import("../api").SearchResponse>>} */
const resultCache = new WeakMap();

/**
 * @param {import("./Canvas").Stroke[]} strokes
 * @returns {Loadable<import("../api").SearchResponse | undefined>}
 */
function useSearchResultLoadable(strokes) {
  const stroke = strokes[strokes.length - 1];
  if (!stroke) {
    return emptyResultLoadable;
  }
  let loadable = resultCache.get(stroke);
  if (!loadable) {
    loadable = new Loadable(searchByStrokes(strokes));
    resultCache.set(stroke, loadable);
  }
  return loadable;
}

/**
 * @typedef LoadResultProps
 * @property {Loadable<import("../api").SearchResponse | undefined>} loadable
 * @property {string} fallbackMessage
 * @property {boolean} loading
 */
/**
 * @param {LoadResultProps} param
 */
function LoadResult({ loadable, fallbackMessage, loading }) {
  const state = useLoadable(loadable);
  if (state.state === "error") {
    return <Result result={`エラー: ${state.error}`} loading={loading} />;
  }
  if (state.value === undefined) {
    return <Result result={fallbackMessage || []} loading={loading} />;
  }
  return <Result result={state.value} loading={loading} />;
}
