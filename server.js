"use strict";

/* Local static file server + /api/run.
   Serves the same files python -m http.server did, and adds a Java runner
   that compiles and executes against a problem's example test cases. */

const http = require("http");
const fs = require("fs");
const path = require("path");

const { supports } = require("./tools/harness");
const { getJobsBundle, queryJobs } = require("./tools/jobs");
const { generateContent } = require("./tools/gemini");
const { runSolution, hasLocalJava, MAX_CODE } = require("./tools/run-code");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;

/* Load problems once. The generator writes `const PROBLEMS = ...` which we
   evaluate in a sandbox so the server can look up a slug. */
const PROBLEMS = (() => {
  const src = fs.readFileSync(path.join(ROOT, "data", "problems.js"), "utf8");
  const sandbox = {};
  // eslint-disable-next-line no-new-func
  Function("exports", src + "\nexports.PROBLEMS = PROBLEMS;")(sandbox);
  return sandbox.PROBLEMS;
})();
const BY_SLUG = new Map(PROBLEMS.map((p) => [p.slug, p]));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".jar": "application/java-archive"
};

function send(res, status, body, headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body == null ? "" : String(body));
  res.writeHead(status, {
    "Content-Length": payload.length,
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(payload);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_CODE + 20_000) {
        reject(new Error("Request too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath.includes("..")) return send(res, 400, "Bad path");

  const file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, "Not found");
  }

  const ext = path.extname(file);
  send(res, 200, fs.readFileSync(file), { "Content-Type": MIME[ext] || "application/octet-stream" });
}

/* ------------------------------------------------------------------ */
/* /api/run, /api/coach, /api/jobs                                     */
/* ------------------------------------------------------------------ */

async function handleRun(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body" });
  }

  const slug = body.slug;
  if (!slug || !BY_SLUG.has(slug)) return sendJson(res, 404, { ok: false, error: "Unknown problem" });
  const problem = BY_SLUG.get(slug);
  let tests = problem.tests;
  if (Array.isArray(body.custom) && body.custom.length) {
    tests = body.custom.map((c) => ({
      args: c.args,
      expected: c.expected == null ? null : String(c.expected)
    }));
  }

  const result = await runSolution({ code: body.code, meta: problem.meta, tests });
  const status = result.error && !result.stage ? 400 : 200;
  sendJson(res, status, result);
}

async function handleCoach(req, res) {
  const raw = await readBody(req);
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const text = await generateContent(body);
  sendJson(res, 200, { ok: true, text });
}

async function handleJobs(req, res) {
  const url = new URL(req.url, "http://localhost");
  const query = Object.fromEntries(url.searchParams.entries());
  const bundle = await getJobsBundle(query.refresh === "1");
  sendJson(res, 200, queryJobs(bundle, query));
}

/* ------------------------------------------------------------------ */
/* http                                                                */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  try {
    const pathOnly = (req.url || "").split("?")[0];
    if (req.method === "POST" && pathOnly === "/api/run") {
      return await handleRun(req, res);
    }
    if (req.method === "POST" && pathOnly === "/api/coach") {
      return await handleCoach(req, res);
    }
    if (req.method === "GET" && pathOnly === "/api/jobs") {
      return await handleJobs(req, res);
    }
    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(req, res);
    }
    send(res, 405, "Method not allowed");
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { ok: false, error: err.message || "Server error" });
  }
});

server.listen(PORT, () => {
  const runnable = PROBLEMS.filter((p) => p.runnable && supports(p.meta)).length;
  console.log(`Hackera running at http://localhost:${PORT}`);
  console.log(`  Java : ${hasLocalJava() ? "local JDK" : "in-browser runner"}`);
  console.log(`  Run  : ${runnable}/${PROBLEMS.length} problems supported`);
  console.log(`  Jobs : /api/jobs (latest postings)`);
});
