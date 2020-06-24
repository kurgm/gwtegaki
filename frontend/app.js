#!/usr/bin/env node
// @ts-check

const readline = require('readline');
const { spawn } = require('child_process');

const express = require('express');

const app = express();
const port = +process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.post('/api/recognize', async (req, res) => {
  console.log(req.body);
  let result;
  try {
    result = await recognize(req.body.query);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
    return;
  }
  console.log(result);
  res.json(result);
});

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}/`);
});

const searchIpc = (() => {
  const proc = spawn('../backend/search.py');
  const stdoutRL = readline.createInterface({
    input: proc.stdout,
    crlfDelay: Infinity,
  });
  proc.stderr.on('data', (data) => {
    console.warn("" + data);
  });
  proc.on('close', (code) => {
    console.error(`search process exited with code ${code}`);
    process.exit(1);
  });
  proc.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });
  proc.stdin.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  const promises = [];
  stdoutRL.on('line', (line) => {
    const obj = promises.shift();
    if (!obj) {
      return;
    }
    obj.resolve(line);
  });

  /**
   * @param {string} query 
   * @returns {Promise<string>}
   */
  function handleQuery(query) {
    proc.stdin.write(`${query}\n`);
    return new Promise((resolve, reject) => {
      promises.push({ resolve, reject });
    });
  }
  return handleQuery;
})();

/** @param {string} features */
async function recognize(features) {
  const result = await searchIpc(features);
  if (result === 'error') {
    throw new Error('search failed');
  }
  return JSON.parse(result);
}
