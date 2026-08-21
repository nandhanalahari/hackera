/* Generates ../data/problems.js
 *
 * Pulls official problem statements, Java stubs, topic tags and hints from
 * LeetCode's public GraphQL endpoint, then merges company frequency data from
 * snehasishroy/leetcode-companywise-interview-questions.
 *
 * Run once:  node tools/build-problems.js
 */

const fs = require("fs");
const path = require("path");
const { NEETCODE_150, BLIND_75, COMPANIES } = require("./lists");
const { PREMIUM } = require("./premium");

const GRAPHQL = "https://leetcode.com/graphql";
const RAW = "https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master";
const OUT = path.join(__dirname, "..", "data", "problems.js");
const CACHE = path.join(__dirname, ".cache.json");

/* Include every slug that appears in any tracked company's interview list,
   not just NeetCode/Blind plus a small TikTok extra set. */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* company CSVs                                                        */
/* ------------------------------------------------------------------ */

function slugFromUrl(url) {
  return url.replace(/\/+$/, "").split("/").pop();
}

/* Fields are ID,URL,Title,Difficulty,Acceptance %,Frequency %. Titles can
   contain commas, so take two fields from the left and three from the right
   and treat whatever is left over as the title. */
function parseCsv(text) {
  return text
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const parts = line.split(",");
      if (parts.length < 6) return null;
      const url = parts[1];
      const freq = parseFloat(parts[parts.length - 1]) || 0;
      const difficulty = parts[parts.length - 3];
      return { slug: slugFromUrl(url), url, difficulty, freq };
    })
    .filter(Boolean);
}

async function fetchCompany(company) {
  const out = {};
  for (const [window, file] of [["recent", "six-months.csv"], ["all", "all.csv"]]) {
    try {
      const res = await fetch(`${RAW}/${company}/${file}`);
      if (!res.ok) continue;
      out[window] = parseCsv(await res.text());
    } catch {
      /* a missing window is fine; "all" is the one that matters */
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* LeetCode                                                            */
/* ------------------------------------------------------------------ */

const QUERY = `query q($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId title titleSlug difficulty isPaidOnly
    topicTags { name }
    content
    hints
    codeSnippets { lang code }
    metaData
    exampleTestcases
    stats
  }
}`;

/* Bump when QUERY changes so stale cache entries are refetched. */
const CACHE_VERSION = 2;

async function fetchProblem(slug, attempt = 0) {
  try {
    const res = await fetch(GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        Referer: `https://leetcode.com/problems/${slug}/`
      },
      body: JSON.stringify({ query: QUERY, variables: { titleSlug: slug } })
    });
    if (res.status === 429 && attempt < 4) {
      await sleep(3000 * (attempt + 1));
      return fetchProblem(slug, attempt + 1);
    }
    const body = await res.json();
    return (body.data && body.data.question) || null;
  } catch (e) {
    if (attempt < 3) {
      await sleep(1500 * (attempt + 1));
      return fetchProblem(slug, attempt + 1);
    }
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* test cases                                                          */
/* ------------------------------------------------------------------ */

/* Expected outputs are not a structured field; they only exist inside the
   statement HTML as "<strong>Output:</strong> [0,1]". Inputs come from
   exampleTestcases, which is a flat newline-separated list, so the two are
   paired up by position and only trusted when the counts agree. */
function stripHtml(s) {
  return String(s)
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function extractTests(q) {
  let meta;
  try {
    meta = JSON.parse(q.metaData || "{}");
  } catch {
    return { meta: null, tests: [], runnable: false, reason: "unreadable metadata" };
  }

  // Design problems ("LRU Cache") drive a class through an operation list.
  if (!meta.name || !Array.isArray(meta.params)) {
    return { meta, tests: [], runnable: false, reason: "class-design problem" };
  }

  const lines = String(q.exampleTestcases || "").split("\n").filter((l) => l.length);
  const arity = meta.params.length;
  if (!arity || lines.length % arity !== 0) {
    return { meta, tests: [], runnable: false, reason: "inputs do not divide evenly" };
  }

  const inputs = [];
  for (let i = 0; i < lines.length; i += arity) inputs.push(lines.slice(i, i + arity));

  /* Two statement formats are in circulation: the older one puts the value as
     bare text inside a <pre>, the newer wraps it in <span class="example-io">.
     Capture to the end of the line or paragraph, then strip markup. */
  const outputs = [];
  const re = /<strong>\s*Output:?\s*<\/strong>\s*(.*?)(?:<\/p>|\n)/gis;
  let m;
  while ((m = re.exec(q.content || ""))) outputs.push(stripHtml(m[1]));

  if (!outputs.length || outputs.length !== inputs.length) {
    return { meta, tests: [], runnable: false, reason: `paired ${inputs.length} inputs with ${outputs.length} outputs` };
  }
  if (outputs.some((o) => !o)) {
    return { meta, tests: [], runnable: false, reason: "an expected output came out empty" };
  }

  return {
    meta,
    tests: inputs.map((args, i) => ({ args, expected: outputs[i] })),
    runnable: true,
    reason: ""
  };
}

function acceptanceRate(q) {
  try {
    const s = JSON.parse(q.stats || "{}");
    const n = parseFloat(String(s.acRate).replace("%", ""));
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
  } catch {
    return null;
  }
}

function invert(listObj) {
  const map = {};
  for (const [category, slugs] of Object.entries(listObj)) {
    slugs.forEach((s, i) => (map[s] = { category, order: i }));
  }
  return map;
}

(async function main() {
  const nc = invert(NEETCODE_150);
  const bl = invert(BLIND_75);

  /* LeetCode responses are immutable enough to cache, which keeps reruns
     (after editing lists or premium text) to a few seconds instead of 90. */
  const cached = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
  const cache = cached.__version === CACHE_VERSION ? cached : { __version: CACHE_VERSION };

  console.log("Fetching company lists...");
  const companyData = {};
  for (const c of COMPANIES) {
    companyData[c] = await fetchCompany(c);
    const n = (companyData[c].all || []).length;
    process.stdout.write(`  ${c}: ${n}\n`);
    await sleep(80);
  }

  // slug -> { company -> {freq, recent} }
  const tags = {};
  for (const [company, windows] of Object.entries(companyData)) {
    for (const row of windows.all || []) {
      tags[row.slug] = tags[row.slug] || {};
      tags[row.slug][company] = { freq: row.freq, recent: false };
    }
    for (const row of windows.recent || []) {
      tags[row.slug] = tags[row.slug] || {};
      tags[row.slug][company] = { freq: row.freq, recent: true };
    }
  }

  const slugs = new Set([...Object.keys(nc), ...Object.keys(bl)]);
  const fromLists = slugs.size;

  for (const windows of Object.values(companyData)) {
    for (const row of windows.all || []) slugs.add(row.slug);
  }

  console.log(
    `\n${fromLists} from NeetCode/Blind, ${slugs.size - fromLists} more from company lists = ${slugs.size} total\n`
  );

  const problems = [];
  const failed = [];
  let i = 0;

  for (const slug of slugs) {
    i++;
    let q = cache[slug];
    if (!q) {
      q = await fetchProblem(slug);
      if (q) cache[slug] = q;
      await sleep(280);
    }
    if (!q) {
      failed.push(slug);
      process.stdout.write(`  [${i}/${slugs.size}] FAILED ${slug}\n`);
      continue;
    }

    const java = (q.codeSnippets || []).find((c) => c.lang === "Java");
    const fallback = PREMIUM[slug] || {};
    const companies = Object.entries(tags[slug] || {})
      .map(([name, v]) => ({ name, freq: v.freq, recent: v.recent }))
      .sort((a, b) => b.freq - a.freq);

    const content = q.content || fallback.content || "";
    const { meta, tests, runnable, reason } = extractTests({ ...q, content });

    problems.push({
      slug,
      id: Number(q.questionFrontendId),
      title: q.title,
      difficulty: q.difficulty,
      paid: !!q.isPaidOnly,
      acRate: acceptanceRate(q),
      topics: (q.topicTags || []).map((t) => t.name),
      content,
      java: (java && java.code) || fallback.java || "",
      hints: q.hints || [],
      companies,
      meta,
      tests,
      runnable,
      notRunnable: runnable ? "" : reason,
      neetcode150: nc[slug] || null,
      blind75: bl[slug] || null
    });

    if (i % 25 === 0) process.stdout.write(`  [${i}/${slugs.size}] ...\n`);
  }

  fs.writeFileSync(CACHE, JSON.stringify(cache));

  problems.sort((a, b) => a.id - b.id);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    "/* GENERATED by tools/build-problems.js -- do not edit by hand. */\n" +
      "const PROBLEMS = " + JSON.stringify(problems) + ";\n" +
      "const NEETCODE_ORDER = " + JSON.stringify(Object.keys(NEETCODE_150)) + ";\n" +
      "const BLIND_ORDER = " + JSON.stringify(Object.keys(BLIND_75)) + ";\n"
  );

  const noContent = problems.filter((p) => !p.content).map((p) => p.slug);
  console.log(`\nWrote ${problems.length} problems to ${OUT}`);
  console.log(`  size            : ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
  console.log(`  neetcode150     : ${problems.filter((p) => p.neetcode150).length}`);
  console.log(`  blind75         : ${problems.filter((p) => p.blind75).length}`);
  console.log(`  with java stub  : ${problems.filter((p) => p.java).length}`);
  console.log(`  with companies  : ${problems.filter((p) => p.companies.length).length}`);
  console.log(`  tagged tiktok   : ${problems.filter((p) => p.companies.some((c) => c.name === "tiktok")).length}`);
  console.log(`  paid-only       : ${problems.filter((p) => p.paid).length}`);
  console.log(`  with acRate     : ${problems.filter((p) => p.acRate != null).length}`);
  console.log(`  runnable w/tests: ${problems.filter((p) => p.runnable).length}`);
  console.log(`  total testcases : ${problems.reduce((n, p) => n + p.tests.length, 0)}`);

  const why = {};
  problems.filter((p) => !p.runnable).forEach((p) => (why[p.notRunnable] = (why[p.notRunnable] || 0) + 1));
  Object.entries(why)
    .sort((a, b) => b[1] - a[1])
    .forEach(([r, n]) => console.log(`    not runnable  : ${n} (${r})`));
  if (noContent.length) console.log(`  EMPTY CONTENT   : ${noContent.join(", ")}`);
  if (failed.length) console.log(`  FAILED SLUGS    : ${failed.join(", ")}`);
})();
