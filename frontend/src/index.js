// @ts-check

import 'regenerator-runtime/runtime';

import { strokes_to_feature_array } from 'gwtegaki-model/feature';

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

  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;

  /** @type {[number, number][] | null} */
  let stroke = null;

  /**
   * @param {MouseEvent} evt
   */
  function addToStroke(evt) {
    if (!stroke) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((evt.clientX - rect.left) / (rect.right - rect.left) * 200);
    const y = Math.round((evt.clientY - rect.top) / (rect.bottom - rect.top) * 200);
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
  canvas.addEventListener('mousedown', (evt) => {
    stroke = [];
    addToStroke(evt);
    evt.preventDefault();
  });
  document.addEventListener('mousemove', (evt) => {
    if (!stroke) {
      return;
    }
    addToStroke(evt);
    evt.preventDefault();
  });
  document.addEventListener('mouseup', () => {
    if (!stroke) {
      return;
    }
    commitStroke();
    stroke = null;
  });

  let firstSearch = true;

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
    const feature = strokes_to_feature_array(strokes);
    let queryLength = feature.length;
    for (; queryLength > 1; queryLength--) {
      if (feature[queryLength - 1] !== 0) {
        break;
      }
    }
    const query = feature.slice(0, queryLength).join(' ');
    const searchResultPromise = (async () => {
      const API_URL = process.env.SEARCH_API_URL;
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `query=${query}`,
      });
      if (!response.ok) {
        throw new Error("server fail");
      }
      /** @type {Result[]} */
      const result = await response.json();
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
    if (firstSearch) {
      firstSearch = false;
      showMessage('検索中… (初回は読み込みに20〜30秒かかることがあります)');
    }
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
      setResult(await searchResultPromises[searchResultPromises.length - 1]);
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
