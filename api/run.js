"use strict";

/* Vercel route for /api/run.
   A JDK is not available in this environment, so the page runs Java in the
   browser. If a JDK ever is present, this uses the same local runner. */

const { hasLocalJava, runSolution } = require("../tools/run-code");

function readJson(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const lang = body.language || 'java';
    
    if (lang === 'java' && !hasLocalJava()) {
      send(res, 200, { ok: false, fallback: "browser" });
      return;
    }

    const result = await runSolution({
      code: body.code,
      language: lang,
      meta: body.meta,
      tests: body.tests
    });
    const status = result.error && !result.stage ? 400 : 200;
    send(res, status, result);
  } catch (err) {
    send(res, err instanceof SyntaxError ? 400 : 500, { ok: false, error: err.message || "Run failed" });
  }
};
