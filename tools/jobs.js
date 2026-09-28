"use strict";

/* Live internship / new-grad feed via Jobright's mini-sites API —
   the same source behind https://www.intern-list.com/ */

const API_URL = "https://jobright.ai/swan/mini-sites/list";
const PAGE_SIZE = 50;
/* Newest-first pages to pull per category. SWE gets more because it's the
   primary track; enough to cover ~2–3 days of fresh postings. */
const FEEDS = [
  { category: "intern:us:swe", kind: "intern", section: "Software Engineering", pages: 8 },
  { category: "intern:us:ml_ai", kind: "intern", section: "ML / AI", pages: 4 },
  { category: "intern:us:data_analysis", kind: "intern", section: "Data Analysis", pages: 3 },
  { category: "intern:us:product_management", kind: "pm", section: "Product Management", pages: 2 },
  { category: "newgrad:us:swe", kind: "newgrad", section: "SWE New Grad", pages: 4 }
];

const RESOURCES = [
  {
    title: "Intern List (Jobright)",
    blurb: "Hourly-updated U.S. & Canada internship feed — the live source Hackera mirrors.",
    url: "https://www.intern-list.com/",
    kind: "jobs"
  },
  {
    title: "2027 New Graduate Jobs",
    blurb: "Companion new-grad list from the same Jobright pipeline.",
    url: "https://www.intern-list.com/",
    kind: "jobs"
  },
  {
    title: "LeetCode company-wise questions",
    blurb: "Reported interview questions by company. Powers the Companies track in Hackera.",
    url: "https://github.com/snehasishroy/leetcode-companywise-interview-questions/tree/master",
    kind: "prep"
  }
];

function formatAge(postedAt) {
  if (!postedAt) return "";
  const ms = Date.now() - Number(postedAt);
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function ageDays(postedAt) {
  if (!postedAt) return null;
  const days = (Date.now() - Number(postedAt)) / 86400000;
  return Number.isFinite(days) ? Math.max(0, days) : null;
}

function mapJob(raw, feed) {
  const p = raw.properties || {};
  const id = String(raw.jobId || "").replace(/"/g, "");
  if (!id || !p.title || !p.company) return null;
  const postedAt = raw.postedAt || null;
  const apply = `https://jobright.ai/jobs/info/${id}?utm_source=hackera&utm_campaign=${encodeURIComponent(feed.section)}`;
  return {
    id: `${feed.kind}:${id}`,
    jobId: id,
    company: String(p.company).trim(),
    title: String(p.title).trim(),
    location: String(p.location || "").trim(),
    salary: p.salary || null,
    workModel: p.workModel || null,
    apply,
    age: formatAge(postedAt),
    ageDays: ageDays(postedAt),
    postedAt,
    section: feed.section,
    category: feed.category,
    sourceId: "intern-list",
    sourceLabel: "Intern List",
    kind: feed.kind,
    industry: Array.isArray(p.industry) ? p.industry : [],
    hireTime: p.hireTime || null
  };
}

async function fetchPage(category, position, count) {
  const url = `${API_URL}?position=${position}&count=${count}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "HackeraJobsTracker/1.0",
      Origin: "https://jobright.ai",
      Referer: "https://jobright.ai/minisites-jobs/intern/us/swe"
    },
    body: JSON.stringify({ category })
  });
  if (!res.ok) throw new Error(`${category} @${position} -> HTTP ${res.status}`);
  const data = await res.json();
  if (!data || data.success === false) {
    throw new Error(`${category}: ${data && data.errorMsg ? data.errorMsg : "bad response"}`);
  }
  return data.result || { jobList: [], total: 0 };
}

async function loadFeed(feed) {
  const jobs = [];
  let remoteTotal = null;
  for (let page = 0; page < feed.pages; page++) {
    const position = page * PAGE_SIZE;
    const result = await fetchPage(feed.category, position, PAGE_SIZE);
    if (remoteTotal == null) remoteTotal = result.total || 0;
    const list = result.jobList || [];
    if (!list.length) break;
    for (const raw of list) {
      const job = mapJob(raw, feed);
      if (job) jobs.push(job);
    }
    if (list.length < PAGE_SIZE) break;
    // Stop early if we're already past ~2 weeks — list is newest-first
    const last = list[list.length - 1];
    if (last && last.postedAt && ageDays(last.postedAt) > 14) break;
  }
  return { jobs, remoteTotal: remoteTotal || jobs.length };
}

async function loadAllJobs() {
  const results = [];
  const errors = [];
  const sources = [];
  let openingsHint = 0;

  await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const { jobs, remoteTotal } = await loadFeed(feed);
        results.push(...jobs);
        openingsHint += remoteTotal;
        sources.push({
          id: feed.category,
          label: feed.section,
          kind: feed.kind,
          remoteTotal,
          fetched: jobs.length,
          html: "https://www.intern-list.com/"
        });
      } catch (err) {
        errors.push({ source: feed.category, error: err.message });
      }
    })
  );

  const seen = new Set();
  const jobs = [];
  for (const j of results) {
    if (seen.has(j.jobId)) continue;
    seen.add(j.jobId);
    jobs.push(j);
  }

  jobs.sort(
    (a, b) =>
      (b.postedAt || 0) - (a.postedAt || 0) ||
      a.company.localeCompare(b.company)
  );

  return {
    jobs,
    errors,
    fetchedAt: new Date().toISOString(),
    sources,
    resources: RESOURCES,
    openingsHint,
    provider: "intern-list"
  };
}

const JOBS_TTL_MS = 10 * 60 * 1000;
let jobsCache = null;

async function getJobsBundle(force = false) {
  if (!force && jobsCache && Date.now() - jobsCache.at < JOBS_TTL_MS) return jobsCache.data;
  const data = await loadAllJobs();
  jobsCache = { at: Date.now(), data };
  return data;
}

function queryJobs(bundle, query) {
  const kind = query.kind || "all";
  const section = query.section || "all";
  const q = String(query.q || "").toLowerCase().trim();
  const sort = query.sort || "new";
  const limit = Math.min(Number(query.limit) || 0, 2000) || 0;

  let jobs = (bundle.jobs || []).slice();
  if (kind !== "all") jobs = jobs.filter((j) => j.kind === kind);
  if (section !== "all") jobs = jobs.filter((j) => j.section === section);
  if (q) {
    jobs = jobs.filter((j) =>
      `${j.company} ${j.title} ${j.location} ${j.section} ${j.salary || ""}`.toLowerCase().includes(q)
    );
  }

  if (sort === "company") {
    jobs.sort((a, b) => a.company.localeCompare(b.company) || (b.postedAt || 0) - (a.postedAt || 0));
  } else {
    jobs.sort((a, b) => (b.postedAt || 0) - (a.postedAt || 0) || a.company.localeCompare(b.company));
  }

  const total = jobs.length;
  if (limit > 0) jobs = jobs.slice(0, limit);

  return {
    ok: true,
    fetchedAt: bundle.fetchedAt,
    provider: bundle.provider || "intern-list",
    openingsHint: bundle.openingsHint || null,
    resources: (bundle.resources || RESOURCES).filter((r) => r.kind !== "resume"),
    sources: bundle.sources,
    errors: bundle.errors,
    total,
    jobs
  };
}

module.exports = {
  FEEDS,
  RESOURCES,
  loadAllJobs,
  getJobsBundle,
  queryJobs,
  formatAge,
  ageDays
};
