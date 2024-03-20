import { useEffect, useSyncExternalStore } from "react";

import Result from "./Result";
import Canvas from "./Canvas";
import style from "./App.module.css";

/**
 * @template T
 * @param {T} defaultValue
 */
const createExternalParam = (defaultValue) => {
  let currentValue = defaultValue;
  /** @type {(() => void)[]} */
  const callbacks = [];

  const get = () => currentValue;
  /** @param {T} value */
  const set = (value) => {
    currentValue = value;
    callbacks.forEach((cb) => cb());
  };
  /** @param {() => void} cb */
  const subscribe = (cb) => {
    callbacks.push(cb);
    return () => {
      const index = callbacks.indexOf(cb);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  };

  const useExternalParam = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, useExternalParam };
};

const {
  get: getStrokes,
  set: setStrokes,
  useExternalParam: useStrokes,
} = createExternalParam(/** @type {import("./Canvas").Stroke[]} */ ([]));

const { set: setCommitStroke, useExternalParam: useCommitStroke } =
  createExternalParam(
    /** @type {(stroke: import("./Canvas").Stroke) => void} */ (() => {})
  );

const {
  get: getSearchResult,
  set: setSearchResult,
  useExternalParam: useSearchResult,
} = createExternalParam(
  /** @type {import("./Result").SearchResult[] | string} */ ([])
);

export default function App() {
  useEffect(() => {
    init();
  }, []);

  const strokes = useStrokes();

  const commitStroke = useCommitStroke();

  const result = useSearchResult();
  const loading = false; // TODO
  return (
    <div className={style.root}>
      <div className={style.writing}>
        <Canvas strokes={strokes} commitStroke={commitStroke} />
        <div className="writing-tools">
          <button id="clear">消去</button>
          <button id="undo">戻す</button>
        </div>
      </div>
      <Result result={result} loading={loading} />
    </div>
  );
}

function init() {
  const gwtegakiModelPromise = import("gwtegaki-model");

  /**
   * @typedef {import("./Result").SearchResult} Result
   */
  /** @param {Result[]} result */
  function setResult(result) {
    setSearchResult(result);
  }

  /**
   * @param {string} msg
   */
  function showMessage(msg) {
    setSearchResult(msg);
  }

  /**
   * @param {string} msg
   */
  function showMessageIfNoResult(msg) {
    const currentResult = getSearchResult();
    if (Array.isArray(currentResult) && currentResult.length > 0) {
      return;
    }
    showMessage(msg);
  }

  setCommitStroke(commitStroke);

  const API_URL = import.meta.env.PUBLIC_SEARCH_API_URL;

  /** @return {Promise<void>} */
  async function apiWarmup() {
    const response = await fetch(API_URL + "warmup", {
      method: "POST",
    });
    if (!response.ok) {
      const text = await response.text().catch((err) => String(err));
      throw new Error(`server warmup error: ${text}`);
    }
    /** @type {{ dumpTime: number; numItems: number; v: string; }} */
    const meta = await response.json();
    document.getElementById("meta_dump_time").textContent = `${new Date(
      meta.dumpTime
    ).toLocaleString("ja-JP", { timeZoneName: "short" })}時点で`;
    document.getElementById(
      "meta_nglyphs"
    ).textContent = `のうち${meta.numItems}個`;
  }

  showMessage("サーバ起動中… (20〜30秒かかることがあります)");
  const apiWarmupPromise = (async () => {
    try {
      await apiWarmup();
    } catch (e) {
      showMessageIfNoResult(`サーバ起動エラー: ${e}`);
      return;
    }
    showMessageIfNoResult("準備完了");
  })();

  /**
   * @param {string} v
   * @param {string} query
   * @return {Promise<Result[]>}
   */
  async function apiSearch(v, query) {
    await apiWarmupPromise;

    showMessageIfNoResult("検索中…");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        v,
        query,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch((err) => String(err));
      throw new Error(`search error: ${text}`);
    }
    return response.json();
  }

  /** @type {Promise<Result[]>[]} */
  let searchResultPromises = [];
  /**
   * @param {import("./Canvas").Stroke} stroke
   */
  function commitStroke(stroke) {
    if (stroke.length < 2) {
      return;
    }
    const theStrokes = getStrokes().concat([stroke]);
    setStrokes(theStrokes);
    const searchResultPromise = (async () => {
      const { strokes_to_feature_array, modelVersion } =
        await gwtegakiModelPromise;
      const feature = strokes_to_feature_array(theStrokes).map(
        (x) => +x.toPrecision(7)
      );
      let queryLength = feature.length;
      for (; queryLength > 1; queryLength--) {
        if (feature[queryLength - 1] !== 0) {
          break;
        }
      }
      const query = feature.slice(0, queryLength).join(" ");
      /** @type {Result[]} */
      const result = await apiSearch(modelVersion, query);
      if (getStrokes() === theStrokes) {
        setResult(result);
      }
      return result;
    })();
    searchResultPromise.catch((err) => {
      if (getStrokes() === theStrokes) {
        showMessage(`エラー: ${err}`);
      }
    });
    searchResultPromises.push(searchResultPromise);
  }

  function clear() {
    setStrokes([]);
    searchResultPromises = [];
    setResult([]);
  }
  document.getElementById("clear").addEventListener("click", () => clear());

  async function undo() {
    let strokes = getStrokes();
    if (strokes.length < 1) {
      return;
    }
    strokes = strokes.slice(0, -1);
    setStrokes(strokes);
    searchResultPromises.pop();

    if (strokes.length === 0) {
      setResult([]);
    } else {
      /** @type {Result[]} */
      let result;
      try {
        result = await searchResultPromises[searchResultPromises.length - 1];
      } catch (err) {
        return;
      }
      setResult(result);
    }
  }
  document.getElementById("undo").addEventListener("click", () => {
    undo();
  });
}
