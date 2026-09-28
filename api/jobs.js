"use strict";

/* Vercel serverless route for /api/jobs. The local app uses server.js. */

const { getJobsBundle, queryJobs } = require("../tools/jobs");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  try {
    const query = req.query || {};
    const bundle = await getJobsBundle(query.refresh === "1");
    const body = queryJobs(bundle, query);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=120");
    res.end(JSON.stringify(body));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: err.message || "Could not load jobs" }));
  }
};
