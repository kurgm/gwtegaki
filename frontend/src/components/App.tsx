import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

import { callApiSearch, callApiWarmup, type SearchResponse } from "../api";
import { metaAtom } from "../store";
import { Loadable, useLoadable } from "../utils/Loadable";
import Canvas, { type Stroke } from "./Canvas";
import Result from "./Result";

import style from "./App.module.css";

type AppState =
  | { type: "warming" }
  | { type: "ready"; error?: string }
  | { type: "running" };

export default function App() {
  const [appState, setAppState] = useState<AppState>({ type: "warming" });
  useEffect(() => {
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
    (stroke: Stroke) => {
      setAppState((appState) =>
        appState.type === "ready" ? { type: "running" } : appState
      );
      addStroke(stroke);
    },
    [addStroke]
  );

  const resultLoadable = useSearchResultLoadable(strokes);
  const fallbackMessage: string = (() => {
    switch (appState.type) {
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
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const addStroke = useCallback((stroke: Stroke) => {
    // clone
    stroke = stroke.slice();
    setStrokes((strokes) => strokes.concat([stroke]));
  }, []);
  const clearStrokes = useCallback(() => {
    setStrokes([]);
  }, []);
  const undoStroke = useCallback(() => {
    setStrokes((strokes) => strokes.slice(0, -1));
  }, []);
  return { strokes, addStroke, clearStrokes, undoStroke };
}

const apiWarmup = (() => {
  let promise: Promise<void>;
  async function warmup() {
    const meta = await callApiWarmup();
    metaAtom.set(meta);
  }

  return () => (promise ??= warmup());
})();

const gwtegakiModelPromise = import("gwtegaki-model");
async function searchByStrokes(strokes: Stroke[]) {
  const { strokes_to_feature_array, modelVersion } = await gwtegakiModelPromise;
  const feature = strokes_to_feature_array(strokes).map((x) => Math.fround(x));
  const query = feature.join(" ");

  await apiWarmup().catch(() => {
    /* ignore */
  });
  return await callApiSearch(modelVersion, query);
}

const emptyResultLoadable = new Loadable<undefined>(Promise.resolve(undefined));

const resultCache = new WeakMap<Stroke, Loadable<SearchResponse>>();

function useSearchResultLoadable(
  strokes: Stroke[]
): Loadable<SearchResponse | undefined> {
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

interface LoadResultProps {
  loadable: Loadable<SearchResponse | undefined>;
  fallbackMessage: string;
  loading: boolean;
}
function LoadResult({ loadable, fallbackMessage, loading }: LoadResultProps) {
  const state = useLoadable(loadable);
  if (state.state === "error") {
    return (
      <Result result={`エラー: ${String(state.error)}`} loading={loading} />
    );
  }
  if (state.value === undefined) {
    return <Result result={fallbackMessage || []} loading={loading} />;
  }
  return <Result result={state.value} loading={loading} />;
}
