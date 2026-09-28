/* System design judgment drills — Altab-style: constraints → decision → learn the axis. */

const SD_TOPICS = [
  {
    id: "requirements",
    name: "Requirements & estimation",
    icon: "◈",
    summary: "Clarify scope, pick the right numbers, and know what to defer before drawing boxes.",
    course: [
      {
        id: "functional",
        title: "Functional requirements before boxes",
        teach: "Interviewers score whether you know what you are building before you name a queue or a database. Start with the actors, the write path, and the read path. Vague words like “real-time” hide a product decision: push every update instantly, or refresh a ranked feed within a few seconds?\n\nFor a news feed, functional requirements are the features you will actually design: create a post, fetch a personalized feed, and say how fresh that feed must feel. Non-functional requirements (DAU, read/write ratio, latency) come next and tell you which design is even legal. Drawing User, Post, and Feed boxes before this is guessing.",
        points: [
          "Name who does what: writer, reader, and any background job.",
          "Turn “real-time” into a number: push latency vs ranking freshness.",
          "State consistency: may a follower miss a post for ~30 seconds?"
        ],
        check: "feed-scope"
      },
      {
        id: "estimation",
        title: "Back-of-envelope, split by path",
        teach: "Capacity math exists to find the bottleneck, not to impress with big numbers. Convert “per month” or “per day” into per second, then split reads from writes. A 100:1 read ratio means the read path is the system you are designing.\n\n100 million new URLs a month is about 100e6 / (30 × 86400) ≈ 40 creates per second. Multiply by the redirect ratio and you get roughly 4,000 reads per second. Writes are boring; hot redirects and forever-retention storage are not. Peak is often 2–5× the average, so say that out loud instead of treating the monthly total as QPS.",
        points: [
          "Per month ÷ 2.6e6 ≈ per second. Per day ÷ 86400.",
          "Always publish read QPS and write QPS separately.",
          "Storage = object size × count × retention. Forever means the disk never shrinks."
        ],
        check: "back-of-envelope"
      },
      {
        id: "scope",
        title: "Scope the 45 minutes",
        teach: "A senior loop is one end-to-end story plus one deep dive, not every subsystem the company owns. Say what you are building, say what you are leaving out, and why. Payments, fraud, and payouts are real systems with different consistency rules; they will eat the clock if you let them.\n\nThe interviewer wants to see you drive. An explicit deferral (“I’ll sketch matching and location, and treat payments as an external service”) is a strength. Covering everything at one-inch depth is how candidates run out of time on the hard part.",
        points: [
          "Pick the core user journey and one hard technical piece.",
          "Name the systems you are not designing.",
          "Deep-dive the piece whose constraints can actually fail."
        ],
        check: "mvp-cut"
      }
    ],
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
    course: [
      {
        id: "stateless-learn",
        title: "Stateless apps scale; sticky sessions don’t",
        teach: "A load balancer can only add machines if any machine can serve any request. Sticky sessions pin a user to one box, so that box is a single point of failure and autoscaling cannot shed load.\n\nMove the ~2KB of session state to a shared store (usually Redis) and keep the app servers disposable. An L7 load balancer then spreads traffic with no affinity. Vertical scaling (a bigger machine) buys time and then you hit a ceiling; hashing users onto fixed pairs is just sticky sessions with extra steps.",
        points: [
          "App tier: no local session, no local disk that requests depend on.",
          "Session or auth state lives in a store every node can read.",
          "Health checks plus a load balancer are what make “add a replica” real."
        ],
        check: "stateless"
      },
      {
        id: "read-scale",
        title: "Scale the read path first",
        teach: "When 99% of traffic is reads and writes are rare, the database is usually not your first bottleneck — repeated identical reads are. An index helps a query, but it does not absorb a thundering spike of the same product page.\n\nPut a cache in front of hot queries (Redis) and a CDN in front of cacheable pages and images. Read replicas help availability and some read QPS, but a replica still does the query and still sits at database latency. A cache hit should be the common case for a catalog that changes thousands of times a day, not millions.",
        points: [
          "Measure the read/write ratio before picking a datastore.",
          "CDN for bytes the browser can cache; Redis for computed query results.",
          "Replicas are a second lever, not a substitute for a cache on a 50ms P99."
        ],
        check: "cache-layer"
      },
      {
        id: "hot-key-learn",
        title: "Hot keys break even designs",
        teach: "Averages lie. One celebrity with 80 million followers is not “a user.” Fan-out-on-write copies a post into every follower’s feed at publish time, which is fine for hundreds of followers and fatal for millions: one write becomes a huge queue and a hot partition.\n\nThe usual fix is hybrid fan-out. Normal accounts fan out on write. High-follower accounts are fanned in on read: the feed merges the celebrity’s recent posts when the follower loads. Naming the hot key is the point of the interview, not picking a faster disk.",
        points: [
          "Ask who is allowed to be huge: followers, SKUs, cities, hashtags.",
          "Fan-out-on-write for the median user; fan-in-on-read for outliers.",
          "A single hot partition will not be saved by adding average-case machines."
        ],
        check: "hot-key"
      }
    ],
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
    course: [
      {
        id: "pick-store",
        title: "Pick the store from the invariant",
        teach: "The datastore follows the rule you cannot break. “Never oversell the last unit” is an atomic read-modify-write across a row, with joins for orders and SKUs. That is a relational database with a transaction (or a carefully locked inventory row).\n\nCassandra and similar wide-column stores win when you can partition huge independent writes and accept weaker multi-row guarantees. Redis is a cache or a coordination tool, not the system of record for money or stock. S3 stores blobs; it does not decrement inventory.",
        points: [
          "ACID + relations + moderate QPS → Postgres or MySQL.",
          "Huge partitionable writes, single-row reads → a wide-column or document store can fit.",
          "Say the invariant out loud before the product name."
        ],
        check: "sql-vs-nosql"
      },
      {
        id: "shard-key",
        title: "Shard by the query, not by fairness",
        teach: "A shard key decides which machine holds a row and therefore which queries stay local. Even distribution is necessary, but useless if every read has to fan out to every shard.\n\nChat history is almost always “give me this conversation.” Build a conversation id from the sorted user pair and hash that. Both people and every message in the thread land together. Sharding by message id spreads writes beautifully and makes a thread a scatter-gather. Sharding by timestamp creates a hot “today” shard.",
        points: [
          "Write down the query you will run on every page load.",
          "Co-locate the rows that query needs.",
          "Hash the key so one celebrity conversation cannot pin a single physical disk forever — or isolate outliers on purpose."
        ],
        check: "sharding-key"
      },
      {
        id: "read-your-writes",
        title: "Replication lag is a product bug",
        teach: "Replicas are usually asynchronous. A write commits on the primary, the response returns, and a read to a replica can still show the old balance. That is fine for a like count and wrong for money.\n\nRead-your-writes means the user who just wrote must observe that write. Route their next read to the primary, wait for the replica to catch up, or use synchronous replication for that entity. A CDN on a balance and CRDTs for currency both make the bug worse.",
        points: [
          "Async replica ⇒ stale reads are normal, not an incident.",
          "After a critical write, pin the following read to the primary.",
          "Do not cache or geo-replicate data the user must see immediately."
        ],
        check: "replication-lag"
      }
    ],
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
    course: [
      {
        id: "cache-aside-learn",
        title: "Cache-aside is the default",
        teach: "Cache-aside means the application reads the cache first. On a miss it loads the database, stores the value with a TTL, and returns it. Writes update the database and either delete the cache key or let the TTL expire.\n\nThat fits data that is read often and written rarely, like a user profile. Write-through (update cache and database together on every edit) is extra machinery when edits are rare. “No cache, only replicas” still pays database latency on every hit. Caching forever with manual purge means the first bug becomes permanent staleness.",
        points: [
          "Read: cache, then database, then fill the cache.",
          "Write: database is source of truth; invalidate or TTL the key.",
          "TTL is your staleness budget. Pick it from the product, not from habit."
        ],
        check: "cache-aside"
      },
      {
        id: "invalidate",
        title: "Invalidate when a human publishes",
        teach: "A TTL is a guess. If an editor publishes a homepage story, waiting for a five-minute edge TTL is a product failure even if “60 seconds is close.” Anonymous traffic belongs on a CDN, but the HTML (or the fragment that names the hero story) needs an explicit purge.\n\nOn publish, emit an event that purges the CDN path or bumps a cache key (`homepage?v=42`). Disabling the CDN throws away the 95% read win. Pushing the page over a WebSocket to every browser does not scale and is the wrong tool for a public page.",
        points: [
          "TTL for data that can be slightly old.",
          "Event-driven purge for content that just changed and everyone will see.",
          "Purge the key, not the whole CDN."
        ],
        check: "invalidation"
      },
      {
        id: "stampede-learn",
        title: "A miss storm is a stampede",
        teach: "If a hot key expires while a million clients ask for it, every request misses together and the database sees a million identical queries. That is a cache stampede, and it happens exactly at the moment you needed the cache (a flash sale).\n\nSingle-flight (one worker rebuilds the key, everyone else waits on that lock) collapses the miss into one database read. A short negative cache or a stale-while-revalidate window keeps serving the last value while you recompute. Client backoff alone still lets huge bursts through.",
        points: [
          "One lock or request-coalescer per hot key.",
          "Prefer serving slightly stale data over falling through to the database.",
          "When the item is sold out, cache that fact so you stop hammering inventory."
        ],
        check: "stampede"
      }
    ],
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
    course: [
      {
        id: "async-learn",
        title: "Take slow work off the request",
        teach: "A signup request should commit the user and return. Email, image processing, and webhooks are allowed to take seconds and fail independently. If you call them inline, their tail latency becomes your API’s tail latency.\n\nAfter the database commit, enqueue a job. A worker sends the email. Queues are usually at-least-once, so the worker must be safe to run twice: an idempotency key (user id + “welcome”) makes a duplicate delivery a no-op. A cron once an hour is too slow for “welcome,” and a synchronous microservice call is the same bug as doing it inline.",
        points: [
          "User-facing handler: validate, commit, enqueue, respond.",
          "Assume the job runs more than once.",
          "Only keep work inline if the user is waiting on that exact result."
        ],
        check: "sync-vs-async"
      },
      {
        id: "order-learn",
        title: "Order is per key, not global",
        teach: "Total order across every chat on earth means one partition and one machine’s throughput. Almost no product needs that. Chat needs order inside one conversation.\n\nIn Kafka, order is guaranteed inside a partition, not across partitions. Key the partition by chat id and each thread stays ordered while different chats run in parallel. A random key maximizes spread and scrambles a thread. Skipping the queue and hoping one WebSocket process orders the world brings back the single machine.",
        points: [
          "Write the scope of ordering: per chat, per user, or truly global.",
          "Partition key = that scope.",
          "Global order is a bottleneck you must justify."
        ],
        check: "ordering"
      },
      {
        id: "backpressure-learn",
        title: "Accept fast, process slow",
        teach: "Video transcoding is CPU-heavy and spiky. Doing it inside the upload request times out clients and couples your API capacity to your GPU capacity.\n\nThe upload handler stores the bytes in object storage, enqueues a transcode job, and returns a job id. Workers drain the queue at whatever rate the CPUs allow. The queue is the buffer. Users already tolerate minutes of processing, so the product contract is “accepted,” not “finished.” Rejecting uploads whenever the queue is non-empty wastes the buffer you added.",
        points: [
          "Object storage holds the blob; the queue holds the work.",
          "Return an id the client can poll.",
          "Scale workers independently from the API."
        ],
        check: "backpressure"
      }
    ],
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
    course: [
      {
        id: "retry-learn",
        title: "Retries multiply an outage",
        teach: "A client that retries three times with no delay turns a 5% timeout rate into a pile-on. Every failed call comes back immediately, the gateway gets slower, more calls time out, and the retry traffic exceeds the original traffic. That is a retry storm.\n\nRetries need a budget: exponential backoff, jitter so clients do not retry in lockstep, and a limit. If the operation is not idempotent — a payment charge with no key — a retry can also double-charge. “Retries improve reliability” is only true after those two controls exist.",
        points: [
          "Backoff + jitter, not an immediate tight loop.",
          "Cap attempts. Fail the request instead of melting the dependency.",
          "Never retry a non-idempotent write blindly."
        ],
        check: "retry-storm"
      },
      {
        id: "breaker-learn",
        title: "Protect the path that must work",
        teach: "A recommendations block is optional. The home feed is not. If the recs service slows down and the feed waits on it, an optional feature takes down the page.\n\nA circuit breaker counts recent failures. Past a threshold it stops calling recs and returns an empty block immediately (fail open for an optional dependency). When the dependency recovers, it lets a few trials through. Raising the feed timeout to 30 seconds just makes every user wait. Inlining ten retries makes the outage worse.",
        points: [
          "Mark dependencies required vs optional.",
          "Fail fast on the optional ones and render the rest.",
          "A breaker is a state machine: closed, open, half-open — not a longer timeout."
        ],
        check: "circuit-breaker"
      },
      {
        id: "idempotency-learn",
        title: "Idempotency keys make retries safe",
        teach: "Mobile networks drop the response after the server has already created the order. The client retries. Without a key, you create a second order and maybe a second charge.\n\nThe client sends an Idempotency-Key (a UUID it generated). The server stores key → order id and the response. A replay with the same key returns the original order instead of creating another. A blanket 409 on every retry punishes the legitimate lost-response case. Switching the create call to GET does not fix a duplicate POST.",
        points: [
          "The client generates the key and sends it on every retry.",
          "The server remembers the first result and replays it.",
          "Uniqueness of the order id is not enough if each retry allocates a new one."
        ],
        check: "idempotency"
      }
    ],
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
