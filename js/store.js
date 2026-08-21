"use strict";

/* State, localStorage persistence, and the Supabase mirror.
   localStorage is authoritative for rendering so the UI never blocks on the
   network; Supabase is a durable copy that is merged back in on startup. */

const $ = (id) => document.getElementById(id);

const KEYS = {
  progress: "oa.progress",
  code: "oa.code",
  reviews: "oa.reviews",
  bank: "oa.bank",
  chat: "oa.chat",
  timer: "oa.timer",
  apiKey: "oa.apiKey",
  layout: "oa.layout",
  prefs: "oa.prefs",
  learning: "oa.learning",
  user: "oa.userKey"
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode; the session still works in memory */
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* A stable per-device id, since the tool has no accounts. */
let userKey = load(KEYS.user, null);
if (!userKey) {
  userKey =
    (crypto.randomUUID && crypto.randomUUID()) ||
    "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  save(KEYS.user, userKey);
}

/* ------------------------------------------------------------------ */
/* state                                                               */
/* ------------------------------------------------------------------ */

const state = {
  /* problemKey -> { status, attempts, bestScore, solvedAt } */
  progress: load(KEYS.progress, {}),
  /* problemKey -> last code in the editor */
  code: load(KEYS.code, {}),
  /* problemKey -> most recent structured review */
  reviews: load(KEYS.reviews, {}),
  bank: load(KEYS.bank, []),
  chat: load(KEYS.chat, []),
  timer: load(KEYS.timer, {
    endsAt: null,
    remainingMs: 70 * 60 * 1000,
    running: false,
    paused: false
  }),
  layout: load(KEYS.layout, { desc: 46, chat: 380, chatOpen: false }),
  prefs: load(KEYS.prefs, {
    company: "tiktok",
    uiTheme: "codesignal",
    companySort: "freq",
    filters: { q: "", difficulty: "all", status: "all", company: "all" },
    expandedPattern: null
  }),
  learning: load(KEYS.learning, {}),
  route: { name: "home" },
  busy: false,
  synced: false
};

const persist = {
  progress: () => save(KEYS.progress, state.progress),
  code: () => save(KEYS.code, state.code),
  reviews: () => save(KEYS.reviews, state.reviews),
  bank: () => save(KEYS.bank, state.bank),
  chat: () => save(KEYS.chat, state.chat),
  timer: () => save(KEYS.timer, state.timer),
  layout: () => save(KEYS.layout, state.layout),
  prefs: () => save(KEYS.prefs, state.prefs),
  learning: () => save(KEYS.learning, state.learning)
};

/* ------------------------------------------------------------------ */
/* progress                                                            */
/* ------------------------------------------------------------------ */

function relatedKeys(key) {
  return typeof progressKeys === "function" ? progressKeys(key) : [key];
}

function progressFor(key) {
  return state.progress[key] || { status: "todo", attempts: 0, bestScore: null, solvedAt: null };
}

/* Prefer the richest record among aliases so a Learn solve lights up Blind 75. */
function bestProgress(key) {
  let best = progressFor(key);
  for (const k of relatedKeys(key)) {
    const p = progressFor(k);
    const rank = (s) => (s === "solved" ? 2 : s === "attempted" ? 1 : 0);
    if (
      rank(p.status) > rank(best.status) ||
      (rank(p.status) === rank(best.status) && (p.attempts || 0) > (best.attempts || 0)) ||
      (rank(p.status) === rank(best.status) && (p.bestScore || 0) > (best.bestScore || 0))
    ) {
      best = p;
    }
  }
  return best;
}

function isSolved(key) {
  return relatedKeys(key).some((k) => progressFor(k).status === "solved");
}

function isAttempted(key) {
  return relatedKeys(key).some((k) => {
    const s = progressFor(k).status;
    return s === "attempted" || s === "solved";
  });
}

function setStatus(key, status) {
  const now = new Date().toISOString();
  for (const k of relatedKeys(key)) {
    const p = progressFor(k);
    p.status = status;
    p.solvedAt = status === "solved" ? p.solvedAt || now : null;
    state.progress[k] = p;
    db.upsertProgress(k, p);
  }
  persist.progress();
}

function recordAttempt(key) {
  for (const k of relatedKeys(key)) {
    const p = progressFor(k);
    p.attempts = (p.attempts || 0) + 1;
    if (p.status === "todo") p.status = "attempted";
    state.progress[k] = p;
    db.upsertProgress(k, p);
  }
  persist.progress();
}

function bumpBestScore(key, score) {
  if (typeof score !== "number") return;
  for (const k of relatedKeys(key)) {
    const p = progressFor(k);
    if (p.bestScore == null || score > p.bestScore) {
      p.bestScore = score;
      state.progress[k] = p;
      db.upsertProgress(k, p);
    }
  }
  persist.progress();
}

function getCode(key) {
  for (const k of relatedKeys(key)) {
    if (state.code[k] != null && state.code[k] !== "") return state.code[k];
  }
  return state.code[key];
}

function setCode(key, code) {
  for (const k of relatedKeys(key)) state.code[k] = code;
  persist.code();
}

/* ------------------------------------------------------------------ */
/* Supabase mirror                                                     */
/* ------------------------------------------------------------------ */

const db = {
  url: (window.SUPABASE_URL || "").replace(/\/+$/, ""),
  key: window.SUPABASE_KEY || "",
  online: false,

  get enabled() {
    return !!(this.url && this.key);
  },

  async req(path, opts = {}) {
    if (!this.enabled) return null;
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  },

  /* Every write is best-effort. Losing the network must never cost you the
     code sitting in the editor, which is already in localStorage. */
  async safe(fn) {
    if (!this.enabled) return null;
    try {
      const out = await fn();
      this.setOnline(true);
      return out;
    } catch (err) {
      console.warn("[supabase]", err.message);
      this.setOnline(false);
      return null;
    }
  },

  setOnline(v) {
    if (this.online === v) return;
    this.online = v;
    renderSyncBadge();
  },

  async saveAttempt({ key, title, section, code }) {
    const rows = await this.safe(() =>
      this.req("oa_attempts", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_key: userKey,
          problem_slug: key,
          problem_title: title,
          section,
          code
        })
      })
    );
    return rows && rows[0] ? rows[0].id : null;
  },

  async saveReview(attemptId, key, review) {
    return this.safe(() =>
      this.req("oa_reviews", {
        method: "POST",
        body: JSON.stringify({
          attempt_id: attemptId,
          user_key: userKey,
          problem_slug: key,
          verdict: review.verdict || null,
          score: typeof review.score === "number" ? review.score : null,
          time_complexity: review.time || null,
          space_complexity: review.space || null,
          summary: review.summary || null,
          strengths: review.strengths || [],
          improvements: review.improvements || [],
          resources: review.resources || [],
          raw: review.raw || null
        })
      })
    );
  },

  async upsertProgress(key, p) {
    return this.safe(() =>
      this.req("oa_progress", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          user_key: userKey,
          problem_slug: key,
          status: p.status,
          attempts: p.attempts || 0,
          best_score: p.bestScore,
          last_code: (state.code[key] || "").slice(0, 20000),
          solved_at: p.solvedAt,
          updated_at: new Date().toISOString()
        })
      })
    );
  },

  async loadProgress() {
    return this.safe(() =>
      this.req(`oa_progress?user_key=eq.${encodeURIComponent(userKey)}&select=*`)
    );
  },

  async loadReviews(limit = 200) {
    return this.safe(() =>
      this.req(
        `oa_reviews?user_key=eq.${encodeURIComponent(userKey)}&select=*&order=created_at.desc&limit=${limit}`
      )
    );
  }
};

/* Pull the durable copy back in. Remote wins only where it is strictly ahead,
   so a fresh browser recovers history without clobbering unsynced local work. */
async function syncFromDb() {
  const rows = await db.loadProgress();
  if (rows) {
    let changed = false;
    for (const r of rows) {
      const local = state.progress[r.problem_slug];
      const remoteSolved = r.status === "solved";
      if (!local || (remoteSolved && local.status !== "solved") || (r.attempts || 0) > (local.attempts || 0)) {
        state.progress[r.problem_slug] = {
          status: remoteSolved || local?.status === "solved" ? (remoteSolved ? "solved" : local.status) : r.status,
          attempts: Math.max(r.attempts || 0, local?.attempts || 0),
          bestScore: r.best_score ?? local?.bestScore ?? null,
          solvedAt: r.solved_at || local?.solvedAt || null
        };
        changed = true;
      }
      if (r.last_code && !state.code[r.problem_slug]) {
        state.code[r.problem_slug] = r.last_code;
        changed = true;
      }
    }
    if (changed) {
      persist.progress();
      persist.code();
    }
  }

  const reviews = await db.loadReviews();
  if (reviews) {
    for (const r of reviews) {
      if (state.reviews[r.problem_slug]) continue; // newest first, keep the first seen
      state.reviews[r.problem_slug] = {
        verdict: r.verdict,
        score: r.score,
        time: r.time_complexity,
        space: r.space_complexity,
        summary: r.summary,
        strengths: r.strengths || [],
        improvements: r.improvements || [],
        resources: r.resources || [],
        at: r.created_at
      };
    }
    persist.reviews();
  }

  state.synced = true;
  return !!rows;
}
