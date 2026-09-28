"use strict";

/* Server-side Gemini call. The key stays in the environment or local config.js,
   never in the page. */

const fs = require("fs");
const path = require("path");

function geminiKey() {
  const fromEnv = (process.env.GEMINI_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  try {
    const src = fs.readFileSync(path.join(__dirname, "..", "config.js"), "utf8");
    const m = src.match(/GEMINI_API_KEY\s*=\s*"([^"]*)"/);
    if (m && m[1].trim()) return m[1].trim();
  } catch {
    /* no local config.js */
  }
  return "";
}

function geminiModel() {
  return (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
}

async function generateContent(body) {
  const key = geminiKey();
  if (!key) {
    const err = new Error("Coach is not configured. Set GEMINI_API_KEY on the server.");
    err.status = 503;
    throw err;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data.error && data.error.message) || `Gemini HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p.text || "").join("").trim() : "";
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason;
    const err = new Error("Empty response from Gemini" + (reason ? ` (${reason})` : ""));
    err.status = 502;
    throw err;
  }
  return text;
}

module.exports = { generateContent, geminiKey };
