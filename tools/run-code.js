"use strict";

/* Compile and run a solution against example cases with a local JDK.
   Hosts without Java (Vercel) return fallback: "browser" and the page
   compiles in the visitor's browser instead. */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

const {
  TYPES,
  supports,
  unsupportedReason,
  buildMain,
  buildSolution,
  remapCompileError,
  gradeOutput
} = require("./harness");

const RUN_TIMEOUT_MS = 8000;
const MAX_CODE = 80_000;
const JAVA_HOME = process.env.JAVA_HOME || "/opt/homebrew/opt/openjdk";
const JAVA = path.join(JAVA_HOME, "bin", "java");
const JAVAC = path.join(JAVA_HOME, "bin", "javac");
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function hasLocalJava() {
  return fs.existsSync(JAVA) && fs.existsSync(JAVAC);
}

function sanitizeMeta(meta) {
  if (!supports(meta)) return null;
  if (!IDENT.test(meta.name)) return null;
  if (!meta.params.every((p) => IDENT.test(p.name) && TYPES[p.type])) return null;
  const ret = meta.return && meta.return.type;
  if (ret !== "void" && !TYPES[ret]) return null;
  return meta;
}

function sanitizeTests(tests) {
  if (!Array.isArray(tests) || !tests.length || tests.length > 40) return null;
  const out = [];
  for (const t of tests) {
    if (!t || !Array.isArray(t.args) || t.args.length > 12) return null;
    const args = t.args.map((a) => String(a));
    if (args.some((a) => a.length > 20_000)) return null;
    out.push({
      args,
      expected: t.expected == null || t.expected === "" ? null : String(t.expected)
    });
  }
  return out;
}

async function runLocal(solution, main) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hackera-run-"));
  try {
    fs.writeFileSync(path.join(dir, "Solution.java"), solution);
    fs.writeFileSync(path.join(dir, "Main.java"), main);
    try {
      await execFileAsync(JAVAC, ["Solution.java", "Main.java"], {
        cwd: dir,
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, PATH: path.join(JAVA_HOME, "bin") + ":" + (process.env.PATH || "") }
      });
    } catch (err) {
      return {
        ok: false,
        stage: "compile",
        error: remapCompileError(err.stderr || err.message || "").trim() || "Compilation failed",
        cases: []
      };
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
        return {
          ok: false,
          stage: "runtime",
          error: `Timed out after ${RUN_TIMEOUT_MS / 1000}s. Check for an infinite loop.`,
          cases: []
        };
      }
      stdout = err.stdout || "";
      if (!stdout) {
        return {
          ok: false,
          stage: "runtime",
          error: (err.stderr || err.message || "Runtime error").toString().trim(),
          cases: []
        };
      }
    }
    return { stdout };
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* temp dir cleanup is best-effort */
    }
  }
}

async function runSolution({ code, language, meta, tests }) {
  const source = String(code || "");
  if (!source.trim()) return { ok: false, error: "Editor is empty" };
  if (source.length > MAX_CODE) return { ok: false, error: "Code too large" };
  if (language === 'java' && !hasLocalJava()) return { ok: false, fallback: "browser" };

  const cleanMeta = sanitizeMeta(meta);
  if (!cleanMeta) {
    return { ok: false, error: unsupportedReason(meta) || "This problem cannot be run" };
  }
  const cleanTests = sanitizeTests(tests);
  if (!cleanTests) return { ok: false, error: "This problem has no runnable tests" };

  let ran;
  if (language === 'python' || language === 'cpp') {
    const { runWandbox } = require('./wandbox');
    let main, compiler;
    if (language === 'python') {
      const { buildPythonMain } = require('./harness-python');
      main = buildPythonMain(cleanMeta, cleanTests, source);
      compiler = 'cpython-3.10.15';
    } else {
      const { buildCppMain } = require('./harness-cpp');
      main = buildCppMain(cleanMeta, cleanTests, source);
      compiler = 'gcc-13.2.0-c'; // actually wait, 'gcc-13.2.0' is for C++ on wandbox? Or gcc-13.2.0? I checked it was 'gcc-13.2.0'
    }
    const apiRes = await runWandbox(compiler === 'gcc-13.2.0-c' ? 'gcc-13.2.0' : compiler, main);
    if (apiRes.status !== '0' && apiRes.compiler_error) {
       return { ok: false, stage: 'compile', error: apiRes.compiler_error, cases: [] };
    }
    ran = { stdout: apiRes.program_output || "" };
  } else {
    const solution = buildSolution(source);
    const main = buildMain(cleanMeta, cleanTests);
    ran = await runLocal(solution, main);
  }
  
  if (ran.stage) return ran;
  return gradeOutput(ran.stdout || "", cleanTests);
}

module.exports = { runSolution, hasLocalJava, MAX_CODE };
