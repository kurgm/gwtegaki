import { strokes_to_feature_array, modelVersion } from 'gwtegaki-model/feature';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = /** @type {HTMLCanvasElement} */(document.getElementById('area'));
  const resultDiv = /** @type {HTMLDivElement} */(document.getElementById('result'));

  /**
   * @typedef {object} Result
   * @property {string} name
   * @property {number} distance
   */
  /** @param {Result[]} result */
  function setResult(result) {
    while (resultDiv.firstChild) {
      resultDiv.removeChild(resultDiv.firstChild);
    }
    for (const { name: glyphName } of result) {
      const a = document.createElement('a');
      a.href = `https://glyphwiki.org/wiki/${glyphName}`;
      const img = document.createElement('img');
      img.src = `https://glyphwiki.org/glyph/${glyphName}.50px.png`;
      img.alt = img.title = glyphName;
      a.appendChild(img);
      const childDiv = document.createElement('div');
      childDiv.appendChild(a);
      resultDiv.appendChild(childDiv);
    }
  }

  /**
   * @param {string} msg 
   */
  function showMessage(msg) {
    while (resultDiv.firstChild) {
      resultDiv.removeChild(resultDiv.firstChild);
    }
    const div = document.createElement('div');
    div.className = 'result-message';
    div.appendChild(document.createTextNode(msg));
    resultDiv.appendChild(div);
  }

  /**
   * @param {string} msg
   */
  function showMessageIfNoResult(msg) {
    if (
      resultDiv.firstChild &&
      resultDiv.firstChild instanceof HTMLDivElement &&
      !resultDiv.firstChild.classList.contains('result-message')
    ) {
      return;
    }
    showMessage(msg);
  }

  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;

  /** @type {[number, number][] | null} */
  let stroke = null;

  /**
   * @typedef Coord
   * @property {number} x
   * @property {number} y
   */
  /**
   * @param {Coord} coord
   */
  function addToStroke({ x, y }) {
    if (!stroke) {
      return;
    }
    stroke.push([x, y]);
    if (stroke.length >= 2) {
      const [sx, sy] = stroke[stroke.length - 2];
      const [tx, ty] = stroke[stroke.length - 1];
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  }

  /**
   * @param {MouseEvent | TouchEvent} evt
   */
  function getCoordFromEvent(evt) {
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = evt instanceof MouseEvent ? evt : evt.touches[0];
    const x = Math.round((clientX - rect.left) / (rect.right - rect.left) * 200);
    const y = Math.round((clientY - rect.top) / (rect.bottom - rect.top) * 200);
    return { x, y };
  }

  /** @param {MouseEvent | TouchEvent} evt */
  function startStrokeEventHandler(evt) {
    stroke = [];
    addToStroke(getCoordFromEvent(evt));
    evt.preventDefault();
  }
  canvas.addEventListener('mousedown', startStrokeEventHandler);
  canvas.addEventListener('touchstart', startStrokeEventHandler);
  /** @param {MouseEvent | TouchEvent} evt */
  function continueStrokeEventHandler(evt) {
    if (!stroke) {
      return;
    }
    addToStroke(getCoordFromEvent(evt));
  }
  document.addEventListener('mousemove', continueStrokeEventHandler, { passive: true });
  document.addEventListener('touchmove', continueStrokeEventHandler, { passive: true });
  /** @param {MouseEvent | TouchEvent} evt */
  function endStrokeEventHandler(evt) {
    if (!stroke) {
      return;
    }
    commitStroke();
    stroke = null;
  }
  document.addEventListener('mouseup', endStrokeEventHandler, { passive: true });
  document.addEventListener('touchend', endStrokeEventHandler, { passive: true });

  const API_URL = process.env.SEARCH_API_URL;

  /** @return {Promise<void>} */
  async function apiWarmup() {
    const response = await fetch(API_URL + 'warmup', {
      method: 'POST',
    });
    if (!response.ok) {
      const text = await response.text().catch((err) => String(err));
      throw new Error(`server warmup error: ${text}`);
    }
    /** @type {{ dumpTime: number; numItems: number; v: string; }} */
    const meta = await response.json();
    document.getElementById('meta_dump_time').textContent = `${new Date(meta.dumpTime).toLocaleString('ja-JP', { timeZoneName: 'short' })}時点で`;
    document.getElementById('meta_nglyphs').textContent = `のうち${meta.numItems}個`;
  }

  showMessage('サーバ起動中… (20〜30秒かかることがあります)');
  const apiWarmupPromise = (async () => {
    try {
      await apiWarmup();
    } catch (e) {
      showMessageIfNoResult(`サーバ起動エラー: ${e}`);
      return;
    }
    showMessageIfNoResult('準備完了');
  })();

  /**
   * @param {string} query
   * @return {Promise<Result[]>}
   */
  async function apiSearch(query) {
    await apiWarmupPromise;

    showMessageIfNoResult('検索中…');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `v=${modelVersion}&query=${query}`,
    });
    if (!response.ok) {
      const text = await response.text().catch((err) => String(err));
      throw new Error(`search error: ${text}`);
    }
    return response.json();
  }

  /** @type {[number, number][][]} */
  let strokes = [];
  /** @type {Promise<Result[]>[]} */
  let searchResultPromises = [];
  function commitStroke() {
    if (!stroke) {
      return;
    }
    strokes = strokes.concat([stroke]);
    const theStrokes = strokes;
    const feature = strokes_to_feature_array(strokes).map((x) => +x.toPrecision(7));
    let queryLength = feature.length;
    for (; queryLength > 1; queryLength--) {
      if (feature[queryLength - 1] !== 0) {
        break;
      }
    }
    const query = feature.slice(0, queryLength).join(' ');
    const searchResultPromise = (async () => {
      /** @type {Result[]} */
      const result = await apiSearch(query);
      if (strokes === theStrokes) {
        setResult(result);
      }
      return result;
    })();
    searchResultPromise.catch((err) => {
      if (strokes === theStrokes) {
        showMessage(`エラー: ${err}`);
      }
    });
    searchResultPromises.push(searchResultPromise);
  }

  function clear() {
    strokes = [];
    searchResultPromises = [];
    ctx.clearRect(0, 0, 200, 200);
    setResult([]);
  }
  document.getElementById('clear').addEventListener('click', () => clear());

  async function undo() {
    if (strokes.length < 1) {
      return;
    }
    strokes = strokes.slice(0, -1);
    searchResultPromises.pop();

    redrawStrokes();
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
  document.getElementById('undo').addEventListener('click', () => { undo(); });

  function redrawStrokes() {
    ctx.clearRect(0, 0, 200, 200);
    ctx.beginPath();
    for (const stroke of strokes) {
      if (!stroke.length) {
        continue;
      }
      const [sx, sy] = stroke[0];
      ctx.moveTo(sx, sy);
      for (let i = 1; i < stroke.length; i++) {
        const [tx, ty] = stroke[i];
        ctx.lineTo(tx, ty);
      }
    }
    ctx.stroke();
  }
});
