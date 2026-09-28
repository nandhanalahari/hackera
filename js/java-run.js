"use strict";

/* In-browser Java runner for hosts that have no JDK (the Vercel deployment).
   CheerpJ provides the JVM. The Eclipse compiler jar at /vendor/ecj.jar
   compiles the same harness the local server uses. */

(function () {
  const LOADER = "https://cjrtnc.leaningtech.com/4.3/loader.js";
  let booting = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-hackera-cj="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        if (window.cheerpjInit) resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.hackeraCj = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not download the in-browser Java runtime."));
      document.head.appendChild(script);
    });
  }

  function boot() {
    if (!booting) {
      booting = (async () => {
        await loadScript(LOADER);
        await cheerpjInit({ version: 8, status: "none" });
      })();
    }
    return booting;
  }

  function withTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  function addSource(path, text) {
    const write = window.cheerpOSAddStringFile || window.cheerpjAddStringFile;
    if (!write) throw new Error("The Java runtime cannot accept source files.");
    write(path, text);
  }

  function captureMain(src, outPath) {
    const quoted = JSON.stringify(outPath);
    const replacement = `static PrintStream openHackeraOut() {
        try {
            return new PrintStream(new FileOutputStream(${quoted}), true);
        } catch (Exception e) {
            return System.err;
        }
    }
    static final PrintStream REAL = openHackeraOut();`;
    return src
      .replace("static final PrintStream REAL = System.out;", replacement)
      .replace(
        "    }\n\n    static void run(String[] raw) {",
        "        REAL.flush();\n    }\n\n    static void run(String[] raw) {"
      );
  }

  async function readText(path) {
    if (typeof cjFileBlob !== "function") return "";
    try {
      const blob = await cjFileBlob(path);
      return blob ? await blob.text() : "";
    } catch {
      return "";
    }
  }

  async function runJava(className, classPath, args, ms, timeoutMessage) {
    const exit = await withTimeout(cheerpjRunMain(className, classPath, ...(args || [])), ms, timeoutMessage);
    return typeof exit === "number" ? exit : 0;
  }

  async function run(opts) {
    const harness = window.HackeraHarness;
    const onStatus = opts.onStatus || function () {};
    const code = String(opts.code || "");
    if (!code.trim()) return { ok: false, error: "Editor is empty" };
    if (!harness || !harness.supports(opts.meta)) {
      return { ok: false, error: "This problem cannot be run" };
    }
    if (!Array.isArray(opts.tests) || !opts.tests.length) {
      return { ok: false, error: "This problem has no runnable tests" };
    }

    onStatus("Loading the Java runtime. The first run downloads it and can take a minute.");
    await withTimeout(boot(), 90000, "The Java runtime took too long to load. Check your connection and try again.");

    const id = Date.now().toString(36);
    const classDir = "/files/cls-" + id;
    const logPath = "/files/log-" + id + ".txt";
    const outPath = "/files/out-" + id + ".txt";
    const solution = harness.buildSolution(code);
    const main = captureMain(harness.buildMain(opts.meta, opts.tests), outPath);

    addSource("/str/Solution.java", solution);
    addSource("/str/Main.java", main);

    onStatus("Compiling…");
    const compiled = await runJava(
      "org.eclipse.jdt.internal.compiler.batch.Main",
      "/app/vendor/ecj.jar",
      ["-1.8", "-bootclasspath", "/lt/8/jre/lib/rt.jar", "-d", classDir, "-log", logPath, "/str/Solution.java", "/str/Main.java"],
      60000,
      "Compilation timed out."
    );

    if (compiled !== 0) {
      const log = (await readText(logPath)).trim();
      return {
        ok: false,
        stage: "compile",
        error: harness.remapCompileError(log || "Compilation failed").trim(),
        cases: []
      };
    }

    onStatus("Running tests…");
    try {
      await runJava("Main", classDir, [], 12000, "Timed out after 12s. Check for an infinite loop.");
    } catch (err) {
      const stdout = await readText(outPath);
      if (!stdout) {
        return { ok: false, stage: "runtime", error: err.message || "Runtime error", cases: [] };
      }
    }

    const stdout = await readText(outPath);
    if (!stdout) {
      return { ok: false, stage: "runtime", error: "The program produced no output.", cases: [] };
    }
    return harness.gradeOutput(stdout, opts.tests);
  }

  window.HackeraJava = { run };
})();
