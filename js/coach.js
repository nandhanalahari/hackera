"use strict";

/* Gemini has two jobs here:
   1. conversational coaching that leads with hints, and
   2. a structured review that can be scored, stored and re-read later. */

const SYSTEM_INSTRUCTION = `You are a high-signal coding interview coach. The user is preparing for timed online assessments and technical interviews in Java.

Rules:
- Lead with a hint, not a full solution. Point at the specific line or the specific missing case and let them fix it. Only write complete corrected code if they explicitly ask, or if they have already had one hint and are still stuck.
- If the logic is fundamentally correct, say so in one sentence and move on. Do not pad with praise or restate their code back to them.
- Always state time and space complexity in Big-O, and say whether it is optimal for the problem.
- Call out concrete edge cases: empty input, single element, all duplicates, all negatives, integer overflow, off-by-one at the boundaries.
- Java specifics matter: == versus .equals on boxed types and Strings, int overflow in (lo + hi) / 2, ArrayDeque over the legacy Stack class, char arithmetic.
- Keep answers under roughly 200 words unless asked to go deeper. Short bullets. No preamble, no sign-off.
- Write complexity as plain text like O(n) or O(n log n). Never use LaTeX or math markup.`;

const REVIEW_SYSTEM = `You are grading a Java solution to a known interview problem. Be exacting and honest: if the code does not actually solve the problem, say so plainly rather than being encouraging.

Scoring guide:
- 90-100: correct, optimal complexity, clean, handles edges.
- 70-89: correct but suboptimal complexity or messy/fragile in places.
- 40-69: right idea, real bug or a missed edge case.
- 0-39: wrong approach, does not compile, or does not solve the stated problem.

For resources, give real, well-known, stable URLs only: LeetCode problem or editorial pages, NeetCode.io, official Java docs, Wikipedia, cp-algorithms.com. Never invent a URL, and never link to a blog post you are not certain exists. Prefer fewer, better links.`;

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["correct", "almost", "incorrect"] },
    score: { type: "integer", description: "Integer from 0 to 100. 90-100 optimal and correct, 70-89 correct but suboptimal, 40-69 right idea with a bug, 0-39 wrong." },
    time: { type: "string" },
    space: { type: "string" },
    optimal: { type: "boolean" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["bug", "edge-case", "performance", "style"] }
        },
        required: ["title", "detail", "severity"]
      }
    },
    edgeCases: { type: "array", items: { type: "string" } },
    resources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          why: { type: "string" }
        },
        required: ["title", "url", "why"]
      }
    }
  },
  required: ["verdict", "score", "time", "space", "optimal", "summary", "improvements", "resources"]
};

async function geminiCall(body) {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  if (!data.text) throw new Error("Empty response from Gemini");
  return data.text;
}

/* ------------------------------------------------------------------ */
/* chat                                                                */
/* ------------------------------------------------------------------ */

async function callGeminiChat() {
  const contents = state.chat
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }));

  return geminiCall({
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
  });
}

/* ------------------------------------------------------------------ */
/* structured review                                                   */
/* ------------------------------------------------------------------ */

function problemContext(problem) {
  const plain = htmlToText(problem.html);
  const lines = [`PROBLEM: ${problem.heading}`, `DIFFICULTY: ${problem.difficulty}`];
  if (problem.topics && problem.topics.length) lines.push(`TOPICS: ${problem.topics.join(", ")}`);
  if (problem.url) lines.push(`URL: ${problem.url}`);
  lines.push("", plain);
  return lines.join("\n");
}

function reviewGeneration(structured) {
  const generationConfig = {
    temperature: 0.2,
    maxOutputTokens: 8192,
    // Gemini 2.5 spends the output budget on hidden reasoning. A truncated
    // review then arrives as a fragment with no JSON object.
    thinkingConfig: { thinkingBudget: 0 }
  };
  if (structured) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = REVIEW_SCHEMA;
  }
  return generationConfig;
}

async function reviewSolution(problem, code) {
  const prompt =
    `${problemContext(problem)}\n\n--- CANDIDATE'S JAVA SOLUTION ---\n${code}\n\n` +
    `Grade this solution against the problem above. The score field is an integer from 0 to 100, not a 10-point scale.`;
  const contents = [{ role: "user", parts: [{ text: prompt }] }];
  const systemInstruction = { parts: [{ text: REVIEW_SYSTEM }] };

  try {
    const text = await geminiCall({
      contents,
      systemInstruction,
      generationConfig: reviewGeneration(true)
    });
    return parseReview(text);
  } catch {
    /* responseSchema is rejected by some models; ask for the same object in prose. */
  }

  const text = await geminiCall({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              prompt +
              `\n\nRespond with ONLY a JSON object, no markdown fence, matching:\n` +
              `{"verdict":"correct|almost|incorrect","score":0-100,"time":"O(..)","space":"O(..)",` +
              `"optimal":true,"summary":"..","strengths":[".."],` +
              `"improvements":[{"title":"..","detail":"..","severity":"bug|edge-case|performance|style"}],` +
              `"edgeCases":[".."],"resources":[{"title":"..","url":"..","why":".."}]}`
          }
        ]
      }
    ],
    systemInstruction,
    generationConfig: reviewGeneration(false)
  });
  return parseReview(text);
}

/* Models invent plausible URLs. Rather than shipping dead links into a study
   plan, keep only hosts that are known to exist and are stable. */
const TRUSTED_HOSTS = [
  "leetcode.com", "neetcode.io", "docs.oracle.com", "en.wikipedia.org",
  "cp-algorithms.com", "developer.mozilla.org", "github.com", "www.geeksforgeeks.org",
  "geeksforgeeks.org", "www.baeldung.com", "baeldung.com", "visualgo.net",
  "www.youtube.com", "youtu.be", "oeis.org", "www.programiz.com"
];

function trustedResources(list) {
  return list.filter((r) => {
    try {
      const host = new URL(r.url).hostname.replace(/^www\./, "");
      return TRUSTED_HOSTS.some((h) => host === h.replace(/^www\./, ""));
    } catch {
      return false;
    }
  });
}

function tryParseJson(value) {
  const attempts = [value, String(value).replace(/,\s*([}\]])/g, "$1")];
  for (const attempt of attempts) {
    try {
      let parsed = JSON.parse(attempt);
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          /* keep the string */
        }
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      /* try the next spelling */
    }
  }
  return null;
}

function objectAt(text, start) {
  if (text[start] !== "{") return "";
  let depth = 0;
  let quote = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') quote = false;
      continue;
    }
    if (ch === '"') quote = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return "";
}

function jsonObjects(text) {
  const found = [];
  let quote = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') quote = false;
      continue;
    }
    if (ch === '"') {
      quote = true;
      continue;
    }
    if (ch !== "{") continue;
    const slice = objectAt(text, i);
    if (!slice) continue;
    found.push(slice);
    i += slice.length - 1;
  }
  return found;
}

function parseReview(text) {
  const raw = String(text || "").trim();
  const candidates = [raw, raw.replace(/```(?:json)?/gi, "")];
  const fence = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match;
  while ((match = fence.exec(raw))) candidates.push(match[1].trim());

  let obj = null;
  for (const candidate of candidates) {
    const spans = [candidate, ...jsonObjects(candidate)];
    for (const span of spans) {
      const parsed = tryParseJson(span);
      if (!parsed) continue;
      if ("verdict" in parsed || "score" in parsed || "summary" in parsed) {
        obj = parsed;
        break;
      }
      obj = obj || parsed;
    }
    if (obj && ("verdict" in obj || "score" in obj || "summary" in obj)) break;
  }
  if (!obj) {
    const preview = raw.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(preview ? "Could not parse the review as JSON. " + preview : "Could not parse the review as JSON.");
  }

  return {
    verdict: obj.verdict || "almost",
    score: typeof obj.score === "number" ? Math.max(0, Math.min(100, Math.round(obj.score))) : null,
    time: obj.time || "",
    space: obj.space || "",
    optimal: !!obj.optimal,
    summary: obj.summary || "",
    strengths: Array.isArray(obj.strengths) ? obj.strengths : [],
    improvements: Array.isArray(obj.improvements) ? obj.improvements : [],
    edgeCases: Array.isArray(obj.edgeCases) ? obj.edgeCases : [],
    resources: Array.isArray(obj.resources) ? trustedResources(obj.resources.filter((r) => r && r.url)) : [],
    raw: text,
    at: new Date().toISOString()
  };
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function htmlToText(html) {
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return (el.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

function renderMarkdown(text) {
  const blocks = [];
  let out = escapeHtml(text);

  out = out.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    blocks.push(`<pre><code>${code.replace(/\n$/, "")}</code></pre>`);
    return `\u0000BLOCK${blocks.length - 1}\u0000`;
  });

  out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/^(\s*)[*-] +/gm, "$1\u2022 ");
  out = out.replace(/\u0000BLOCK(\d+)\u0000/g, (_, i) => blocks[Number(i)]);

  return out;
}
