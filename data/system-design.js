/* System design judgment drills — Altab-style: constraints → decision → learn the axis. */

const SD_TOPICS = [
  {
    id: "requirements",
    name: "Requirements & estimation",
    icon: "◈",
    summary: "Clarify scope, pick the right numbers, and know what to defer before drawing boxes.",
    scenarios: [
      {
        id: "feed-scope",
        title: "Design a social news feed",
        constraints: [
          "10M DAU, 100:1 read-to-write ratio",
          "Posts are immutable after publish",
          "Feed must feel fresh within ~30 seconds"
        ],
        prompt: "The PM asks for 'real-time feed.' What do you nail down first in the interview?",
        choices: [
          "Pick Kafka vs RabbitMQ immediately",
          "Define functional requirements: pull vs push feed, ranking signals, and consistency expectations",
          "Estimate storage: 500 bytes × posts × retention",
          "Draw microservices for User, Post, Feed, Notification"
        ],
        answer: 1,
        axis: "Requirements before boxes. Real-time means different things (push latency vs ranking freshness). Interviewers score whether you clarify read path, write path, and what 'fresh' costs."
      },
      {
        id: "back-of-envelope",
        title: "URL shortener traffic",
        constraints: [
          "100M new URLs/month",
          "100:1 redirect-to-create ratio",
          "URLs kept forever"
        ],
        prompt: "Rough QPS for redirects?",
        choices: [
          "~40 writes/sec, ~4K reads/sec — storage dominates, cache hot keys",
          "~4K writes/sec — same as reads",
          "100M/month ≈ 40/sec total — no need to split read/write",
          "Use 100M as peak QPS for capacity planning"
        ],
        answer: 0,
        axis: "Always split read and write paths. 100M/month ≈ 40 creates/sec; ×100 ratio → ~4K redirects/sec. That drives cache + DB read replica strategy."
      },
      {
        id: "mvp-cut",
        title: "Design Uber ride matching",
        constraints: [
          "45-minute interview",
          "Must show end-to-end flow",
          "Deep dive on one hard piece"
        ],
        prompt: "What do you explicitly defer to stay on time?",
        choices: [
          "Payment, fraud, and driver payouts — sketch matching + location first",
          "Nothing — senior candidates must cover everything",
          "API auth and rate limiting only",
          "Mobile clients — backend only"
        ],
        answer: 0,
        axis: "Scoped MVP wins interviews. Match riders to drivers + location updates is the core; payments are a separate system with different consistency needs."
      }
    ]
  },
  {
    id: "scaling",
    name: "Scaling & load balancing",
    icon: "⬡",
    summary: "Horizontal scale, stateless tiers, and where the bottleneck actually moves.",
    scenarios: [
      {
        id: "stateless",
        title: "Session-heavy web app",
        constraints: [
          "Sticky sessions today on single region",
          "Need 10× traffic for launch week",
          "Session data ~2KB per user"
        ],
        prompt: "Fastest path to horizontal scale?",
        choices: [
          "Bigger vertical machine — simpler",
          "Externalize sessions to Redis + stateless app servers behind L7 LB",
          "Shard users by hash to fixed server pairs",
          "Enable HTTP/2 multiplexing on existing box"
        ],
        answer: 1,
        axis: "Stateless app + centralized session store is the standard scale pattern. Sticky sessions fight autoscaling and fail over badly."
      },
      {
        id: "cache-layer",
        title: "Read-heavy product catalog",
        constraints: [
          "1M products, 10K updates/day",
          "99% reads",
          "P99 read latency target: 50ms"
        ],
        prompt: "First scaling lever after indexing the DB?",
        choices: [
          "Read replicas only — skip cache complexity",
          "CDN for product pages + Redis cache for hot catalog queries",
          "Write-through cache for every update",
          "Move to graph database"
        ],
        answer: 1,
        axis: "Read-heavy + low write churn = cache + CDN. Replicas help but won't alone hit 50ms P99 under spike traffic."
      },
      {
        id: "hot-key",
        title: "Celebrity tweet event",
        constraints: [
          "One user with 80M followers posts",
          "Fan-out-on-write feed architecture",
          "Post must appear quickly for followers"
        ],
        prompt: "What breaks first?",
        choices: [
          "Database disk fills up",
          "Hot key / thundering herd on the celebrity's write fan-out queue",
          "DNS resolution at the CDN",
          "TLS handshake on load balancers only"
        ],
        answer: 1,
        axis: "Fan-out-on-write fails for celebrities. Hybrid: fan-out for normal users, fan-in on read for high-follower accounts."
      }
    ]
  },
  {
    id: "data",
    name: "Databases & storage",
    icon: "▣",
    summary: "SQL vs NoSQL, partitioning, replication, and consistency trade-offs.",
    scenarios: [
      {
        id: "sql-vs-nosql",
        title: "Inventory for e-commerce",
        constraints: [
          "Must prevent overselling the last unit",
          "Moderate QPS, strong product relationships",
          "Reports need joins across orders and SKUs"
        ],
        prompt: "Primary datastore?",
        choices: [
          "Cassandra — web scale",
          "PostgreSQL with transactional inventory rows + optimistic locking",
          "S3 + Lambda on every purchase",
          "Redis as system of record for speed"
        ],
        answer: 1,
        axis: "Strong consistency + relations + ACID for inventory → relational DB. NoSQL shines at huge partitionable write scale, not oversell prevention."
      },
      {
        id: "sharding-key",
        title: "Chat message history",
        constraints: [
          "1B messages/day",
          "Queries almost always by (user_a, user_b) thread",
          "Retention 2 years"
        ],
        prompt: "Shard key?",
        choices: [
          "message_id — even distribution",
          "user_id — one shard per user",
          "hash(conversation_id) where conversation_id = sorted pair of user IDs",
          "timestamp — chronological shards"
        ],
        answer: 2,
        axis: "Shard by access pattern. Conversations are the hot query; hash conversation_id keeps a thread co-located."
      },
      {
        id: "replication-lag",
        title: "Financial balance display",
        constraints: [
          "User transfers money between accounts",
          "Read-your-writes required on balance after transfer",
          "Primary in us-east, replicas globally"
        ],
        prompt: "After a successful transfer API response, user refreshes balance from a read replica.",
        choices: [
          "Always fine — replicas are eventually consistent",
          "Stale read risk — route post-write reads to primary or use sync replication for balance",
          "Add CDN cache on balance",
          "Use CRDTs for money"
        ],
        answer: 1,
        axis: "Read-your-writes is a product requirement. Either sticky read-after-write to primary or quorum/sync for that entity."
      }
    ]
  },
  {
    id: "caching",
    name: "Caching & CDNs",
    icon: "◐",
    summary: "Cache placement, invalidation, and the hard questions interviewers ask.",
    scenarios: [
      {
        id: "cache-aside",
        title: "User profile service",
        constraints: [
          "Profiles change infrequently",
          "Spiky read traffic on viral posts linking profiles",
          "DB can handle average load"
        ],
        prompt: "Caching strategy?",
        choices: [
          "Write-through on every profile edit",
          "Cache-aside: read Redis, on miss load DB and populate TTL",
          "No cache — add read replicas",
          "Cache forever, manual purge only"
        ],
        answer: 1,
        axis: "Cache-aside is the default for read-heavy, occasional write. TTL handles staleness; write-through adds complexity you may not need."
      },
      {
        id: "invalidation",
        title: "News homepage",
        constraints: [
          "Editor publishes hero story — must update within 60s globally",
          "95% traffic is anonymous reads",
          "Static assets already on CDN"
        ],
        prompt: "How do you invalidate the HTML edge cache?",
        choices: [
          "Wait for TTL — 60s is close enough",
          "Publish event triggers CDN purge / cache-key bump for homepage",
          "Disable CDN for HTML",
          "WebSocket push to every browser"
        ],
        answer: 1,
        axis: "Explicit invalidation on publish beats short TTL for editorial content. Event-driven purge is standard."
      },
      {
        id: "stampede",
        title: "Flash sale product page",
        constraints: [
          "Cache expires at sale start",
          "1M users hit same product_id",
          "Single row inventory in DB"
        ],
        prompt: "Cache expires. What prevents 1M concurrent DB hits?",
        choices: [
          "Nothing — DB must survive",
          "Request coalescing / single-flight lock + short-lived negative cache when sold out",
          "Remove caching entirely",
          "Client-side random backoff only"
        ],
        answer: 1,
        axis: "Cache stampede mitigation: lock per key, early recompute, or probabilistic early expiration. Interviewers love naming this failure mode."
      }
    ]
  },
  {
    id: "messaging",
    name: "Queues & async design",
    icon: "⇄",
    summary: "When to async, delivery guarantees, and backpressure.",
    scenarios: [
      {
        id: "sync-vs-async",
        title: "Send welcome email on signup",
        constraints: [
          "Signup API p99 must stay under 200ms",
          "Email provider sometimes takes 2–5 seconds",
          "Duplicate emails are annoying but not catastrophic"
        ],
        prompt: "Where does email sending live?",
        choices: [
          "Inline in signup request — simpler",
          "Enqueue job after DB commit; worker sends email with idempotency key",
          "Cron batch every hour",
          "Separate microservice called synchronously"
        ],
        answer: 1,
        axis: "Async queue decouples user-facing latency from slow dependencies. Idempotency handles at-least-once delivery."
      },
      {
        id: "ordering",
        title: "Chat message delivery",
        constraints: [
          "Messages within one chat must appear in order",
          "Cross-chat order irrelevant",
          "Millions of concurrent chats"
        ],
        prompt: "Kafka partition strategy?",
        choices: [
          "One partition — global order",
          "Partition by chat_id — order preserved per partition",
          "Random partition — max throughput",
          "No queue — direct WebSocket only"
        ],
        answer: 1,
        axis: "Order is scoped. Partition key = conversation/chat gives per-thread ordering without global bottleneck."
      },
      {
        id: "backpressure",
        title: "Video upload pipeline",
        constraints: [
          "Uploads spike during events",
          "Transcoding is CPU-heavy and slow",
          "Users tolerate minutes of processing delay"
        ],
        prompt: "Upload API receives file. Next step?",
        choices: [
          "Transcode synchronously before 200 OK",
          "Store blob in object storage, enqueue transcode job, return job_id",
          "Reject uploads when queue depth > 0",
          "Email user when server is free"
        ],
        answer: 1,
        axis: "Accept fast, process slow. Object storage + queue + workers is the standard media pipeline."
      }
    ]
  },
  {
    id: "reliability",
    name: "Reliability & ops",
    icon: "◉",
    summary: "Failures, retries, idempotency, and what actually keeps you up at night.",
    scenarios: [
      {
        id: "retry-storm",
        title: "Payment gateway timeouts",
        constraints: [
          "Downstream times out 5% under load",
          "Clients auto-retry 3× with no jitter",
          "Gateway is not idempotent"
        ],
        prompt: "What happens during an incident?",
        choices: [
          "Retries help reliability",
          "Retry storm amplifies outage + duplicate charges — need exponential backoff + idempotency keys",
          "Switch to UDP",
          "Disable payments"
        ],
        answer: 1,
        axis: "Blind retries without idempotency are dangerous for payments. Backoff, jitter, and idempotency keys are the fix."
      },
      {
        id: "circuit-breaker",
        title: "Recommendations microservice",
        constraints: [
          "Home feed works without recommendations",
          "Recs service slow causes feed API timeouts",
          "SLA: feed loads even if recs fail"
        ],
        prompt: "Pattern?",
        choices: [
          "Increase feed timeout to 30s",
          "Circuit breaker: fail fast to empty recs block after error threshold",
          "Merge recs into monolith",
          "Retry recs call 10 times inline"
        ],
        answer: 1,
        axis: "Graceful degradation + circuit breaker protects the critical path. Partial responses beat total failure."
      },
      {
        id: "idempotency",
        title: "Create order API",
        constraints: [
          "Mobile clients retry on flaky networks",
          "Double charge is unacceptable",
          "Order ID must be unique"
        ],
        prompt: "Client sends duplicate POST with same Idempotency-Key header.",
        choices: [
          "Create two orders — client bug",
          "Store idempotency key → order_id mapping; return same order on replay",
          "Reject all retries with 409",
          "Use GET instead of POST"
        ],
        answer: 1,
        axis: "Idempotency keys are how payment/order APIs survive retries. Server remembers the first result."
      }
    ]
  }
];

function sdScenarioKey(topicId, scenarioId) {
  return `${topicId}:${scenarioId}`;
}

function sdStats() {
  const total = SD_TOPICS.reduce((n, t) => n + t.scenarios.length, 0);
  const done = Object.keys(state.designProgress || {}).filter((k) => state.designProgress[k]?.completed).length;
  return { total, done };
}
