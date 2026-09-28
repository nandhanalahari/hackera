"use strict";

/* Local static file server + /api/run.
   Serves the same files python -m http.server did, and adds a Java runner
   that compiles and executes against a problem's example test cases. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

const {
  supports,
  unsupportedReason,
  buildMain,
  buildSolution,
  remapCompileError,
  parseRunOutput
} = require("./tools/harness");
const { getJobsBundle, queryJobs } = require("./tools/jobs");
const { generateContent } = require("./tools/gemini");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;
const JAVA_HOME = process.env.JAVA_HOME || "/opt/homebrew/opt/openjdk";
const JAVA = path.join(JAVA_HOME, "bin", "java");
const JAVAC = path.join(JAVA_HOME, "bin", "javac");
const RUN_TIMEOUT_MS = 8000;
const MAX_CODE = 80_000;

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
  ".md": "text/markdown; charset=utf-8"
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
/* /api/run                                                            */
/* ------------------------------------------------------------------ */

function normalize(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/"/g, "'");
}

/* List-of-lists and permutations of equal elements are order-insensitive in
   many problems (Group Anagrams). For everything else, exact match after
   whitespace stripping is enough for the example cases. */
function equal(actual, expected) {
  const a = normalize(actual);
  const e = normalize(expected);
  if (a === e) return true;

  try {
    const ja = JSON.parse(actual.replace(/'/g, '"').replace(/\bnull\b/g, "null"));
    const je = JSON.parse(expected.replace(/'/g, '"'));
    return deepEqualUnordered(ja, je);
  } catch {
    return false;
  }
}

function deepEqualUnordered(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // If elements are themselves arrays/objects, sort by stringified form.
    const sa = a.map((x) => JSON.stringify(x)).sort();
    const sb = b.map((x) => JSON.stringify(x)).sort();
    return sa.every((v, i) => v === sb[i]);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

async function handleRun(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body" });
  }

  const slug = body.slug;
  const code = String(body.code || "");
  if (!slug || !BY_SLUG.has(slug)) return sendJson(res, 404, { ok: false, error: "Unknown problem" });
  if (!code.trim()) return sendJson(res, 400, { ok: false, error: "Editor is empty" });
  if (code.length > MAX_CODE) return sendJson(res, 400, { ok: false, error: "Code too large" });

  const problem = BY_SLUG.get(slug);
  if (!problem.runnable || !supports(problem.meta)) {
    return sendJson(res, 400, {
      ok: false,
      error: problem.notRunnable || unsupportedReason(problem.meta) || "This problem cannot be run locally"
    });
  }

  let tests = problem.tests;
  if (Array.isArray(body.custom) && body.custom.length) {
    // Custom cases only check that they execute without crashing unless an
    // expected value is also provided.
    tests = body.custom.map((c) => ({
      args: c.args,
      expected: c.expected == null ? null : String(c.expected)
    }));
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hackera-run-"));
  try {
    fs.writeFileSync(path.join(dir, "Solution.java"), buildSolution(code));
    fs.writeFileSync(path.join(dir, "Main.java"), buildMain(problem.meta, tests));

    try {
      await execFileAsync(JAVAC, ["Solution.java", "Main.java"], {
        cwd: dir,
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, PATH: path.join(JAVA_HOME, "bin") + ":" + (process.env.PATH || "") }
      });
    } catch (err) {
      const stderr = remapCompileError(err.stderr || err.message || "");
      return sendJson(res, 200, {
        ok: false,
        stage: "compile",
        error: stderr.trim() || "Compilation failed",
        cases: []
      });
    }

    let stdout = "";
    try {
      const out = await execFileAsync(JAVA, ["Main"], {
        cwd: dir,
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, PATH: path.join(JAVA_HOME, "bin") + ":" + (process.env.PATH || "") }
      });
      stdout = out.stdout || "";
    } catch (err) {
      if (err.killed || err.signal === "SIGTERM") {
        return sendJson(res, 200, {
          ok: false,
          stage: "runtime",
          error: `Timed out after ${RUN_TIMEOUT_MS / 1000}s. Check for an infinite loop.`,
          cases: []
        });
      }
      // Runtime exceptions from Main still print via <<<ERROR>>>, but a crash
      // outside that path (e.g. OOM) lands here.
      stdout = err.stdout || "";
      if (!stdout) {
        return sendJson(res, 200, {
          ok: false,
          stage: "runtime",
          error: (err.stderr || err.message || "Runtime error").toString().trim(),
          cases: []
        });
      }
    }

    const runs = parseRunOutput(stdout);
    const cases = tests.map((t, i) => {
      const r = runs[i] || { actual: "", stdout: "", error: "No output for this case", ms: 0 };
      const hasExpected = t.expected != null && t.expected !== "";
      const passed = !r.error && (!hasExpected || equal(r.actual, t.expected));
      return {
        index: i + 1,
        args: t.args,
        expected: t.expected,
        actual: r.actual,
        stdout: r.stdout,
        error: r.error || null,
        ms: r.ms,
        passed,
        custom: !hasExpected
      };
    });

    const passed = cases.filter((c) => c.passed).length;
    return sendJson(res, 200, {
      ok: cases.every((c) => c.passed),
      stage: "run",
      passed,
      total: cases.length,
      cases
    });
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* leave the temp dir; not worth failing the response over */
    }
  }
}

/* ------------------------------------------------------------------ */
/* /api/jobs — live Intern List / Jobright mini-sites feed             */
/* ------------------------------------------------------------------ */

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
  const url = new URL(req.url, "http://localhost");
  const query = Object.fromEntries(url.searchParams.entries());
  const bundle = await getJobsBundle(query.refresh === "1");
  sendJson(res, 200, queryJobs(bundle, query));
}

/* ------------------------------------------------------------------ */
/* http                                                                */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(JAVA) || !fs.existsSync(JAVAC)) {
  console.error(`Java not found at ${JAVA_HOME}. Install with: brew install openjdk`);
  process.exit(1);
}

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
  console.log(`  Java : ${JAVA}`);
  console.log(`  Run  : ${runnable}/${PROBLEMS.length} problems supported`);
  console.log(`  Jobs : /api/jobs (latest postings)`);
});
