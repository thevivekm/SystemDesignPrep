export interface Concept {
  id: string;
  title: string;
  body: string;
}

export const CONCEPTS: Concept[] = [
  {
    id: 'framework',
    title: 'Interview framework',
    body: `A repeatable 45-minute structure keeps you from getting lost.

1. **Clarify requirements (5 min).** Functional (what it does) and non-functional (scale, latency, availability, consistency, durability). Agree on what is *out of scope*.
2. **Back-of-envelope estimates (5 min).** DAU → QPS (reads vs writes) → storage → bandwidth. Only estimate what changes the design.
3. **API & data model (10 min).** The 3–5 key endpoints and the core entities with their access patterns.
4. **High-level design (10 min).** Draw the boxes: clients, LB, services, data stores, caches, queues. Walk one request end to end.
5. **Deep dives (10 min).** Pick the 2–3 hardest parts: the bottleneck, the consistency problem, the hot key, the failure mode.
6. **Trade-offs & wrap-up (5 min).** What you chose, what you rejected and why, what you'd do next.

**Tips**
- Think out loud; the interviewer grades reasoning, not just the final diagram.
- Name concrete technologies only after you've stated the property you need ("a log-structured, partitioned stream — e.g. Kafka").
- Revisit requirements when you make a trade-off: "Since we said eventual consistency is fine for likes…"`,
  },
  {
    id: 'estimates',
    title: 'Estimation cheat-sheet',
    body: `## Handy numbers
| Quantity | Value |
|---|---|
| Seconds per day | ~86,400 ≈ **10⁵** |
| 1M requests/day | ≈ **12 req/s** |
| 1B requests/day | ≈ **12K req/s** |
| Peak multiplier | 2–5× average |

## Latency (rough orders of magnitude)
| Operation | Time |
|---|---|
| L1 cache / main memory reference | 1 ns / 100 ns |
| Read 1 MB sequentially from memory | ~10 µs |
| SSD random read | ~100 µs |
| Round trip in same datacenter | ~0.5 ms |
| Read 1 MB from SSD | ~1 ms |
| Disk seek (HDD) | ~10 ms |
| Round trip cross-continent | ~100–150 ms |

## Sizes
- Char ≈ 1 B (ASCII), UUID 16 B, timestamp 8 B, typical row 100 B–1 KB
- Image ~200 KB–2 MB, 1 min of 1080p video ~100 MB (raw upload), much less after encoding

## Capacity rules of thumb
- A single well-tuned web server: ~1–10K simple req/s
- Single Postgres/MySQL primary: ~5–20K simple writes/s, more reads with replicas
- Redis: ~100K+ ops/s per node
- Kafka partition: ~10 MB/s+ writes`,
  },
  {
    id: 'scaling',
    title: 'Scaling & load balancing',
    body: `## Vertical vs horizontal
- **Vertical:** bigger machine. Simple, but has a ceiling and a single point of failure.
- **Horizontal:** more machines. Requires **stateless** services (session state goes to a cache/DB or a signed token).

## Load balancers
- **L4** (TCP) — fast, no request awareness. **L7** (HTTP) — route by path/header, TLS termination, retries.
- Algorithms: round robin, least connections, consistent hashing (for sticky/cache-friendly routing).
- Health checks remove bad instances; run LBs in pairs or use a managed one to avoid a SPOF.

## Other tools
- **CDN** for static assets and cacheable responses close to users.
- **API gateway** for auth, rate limiting, request routing and aggregation.
- **Autoscaling** on CPU/QPS/queue depth.
- **Read replicas** for read-heavy DB workloads (beware replication lag).`,
  },
  {
    id: 'caching',
    title: 'Caching',
    body: `## Where to cache
Client → CDN → reverse proxy → application cache (Redis/Memcached) → DB buffer pool.

## Patterns
- **Cache-aside (lazy):** app reads cache, on miss reads DB and fills cache. Most common.
- **Read-through / write-through:** the cache layer talks to the DB. Write-through keeps cache fresh but adds write latency.
- **Write-behind:** write to cache, flush to DB asynchronously. Fast but risks data loss.

## Invalidation
- TTLs (simple, bounded staleness), explicit delete on write, or versioned keys.
- "There are only two hard things…" — always state your staleness tolerance.

## Pitfalls
- **Thundering herd / cache stampede:** many misses for the same key at once → request coalescing, locks, or early refresh.
- **Hot keys:** replicate the key across shards, or add a small local in-process cache.
- **Eviction policy:** LRU is the default; LFU for skewed, stable popularity.`,
  },
  {
    id: 'databases',
    title: 'Databases: SQL vs NoSQL',
    body: `## Relational (Postgres, MySQL)
- Strong consistency, transactions (ACID), joins, flexible queries.
- Scales reads with replicas; writes need sharding past one primary.
- Good default when data is relational and you need correctness (payments, bookings, inventory).

## NoSQL families
| Type | Examples | Good for |
|---|---|---|
| Key-value | DynamoDB, Redis | Lookups by key, sessions, carts |
| Wide-column | Cassandra, HBase | Huge write volume, time series, chat messages |
| Document | MongoDB | Flexible, nested records |
| Graph | Neo4j | Relationship-heavy traversal |
| Search | Elasticsearch | Full-text, faceted search |

## Choosing
Start from **access patterns**: what are the queries, how many per second, what consistency do they need? Pick the store that makes the hot query a single-partition lookup.

## Indexes
B-tree (range queries, reads) vs LSM tree (write-heavy). Every index speeds reads and slows writes.`,
  },
  {
    id: 'sharding',
    title: 'Partitioning, replication & consistent hashing',
    body: `## Partitioning (sharding)
- **Range-based:** keys in ranges (A–F, G–M…). Supports range scans; risk of hot ranges.
- **Hash-based:** \`hash(key) mod N\`. Even spread; resharding moves almost everything.
- **Consistent hashing:** keys and nodes on a ring; adding a node moves only ~1/N of keys. Use **virtual nodes** for balance.
- Pick a partition key with high cardinality that matches the hot query (e.g. \`user_id\`, \`chat_id\`).

## Replication
- **Leader–follower:** writes to leader, reads from followers (replication lag ⇒ stale reads).
- **Multi-leader:** writes in multiple regions; needs conflict resolution.
- **Leaderless (Dynamo-style):** write to W of N replicas, read from R; **R + W > N** gives overlap (strong-ish reads).

## Hot partitions
Celebrity users, viral posts: split the key (\`key#shard\`), cache aggressively, or handle them on a separate path.`,
  },
  {
    id: 'cap',
    title: 'CAP, consistency & transactions',
    body: `## CAP
During a network **P**artition you choose **C**onsistency (refuse some requests) or **A**vailability (serve possibly stale data). Without partitions, the real trade-off is latency vs consistency (**PACELC**).

## Consistency models
- **Strong / linearizable:** reads see the latest write. Needed for balances, seat booking, unique usernames.
- **Read-your-writes:** a user sees their own updates (route their reads to the leader, or use session tokens).
- **Eventual:** replicas converge over time. Fine for likes, view counts, feeds.

## Distributed transactions
- **2PC:** atomic across services, but blocking and fragile.
- **Saga:** sequence of local transactions with compensating actions. Prefer for microservices.
- **Outbox pattern:** write the event to an outbox table in the same DB transaction, then publish reliably.
- **Idempotency keys** make retries safe — essential for payments and any at-least-once pipeline.`,
  },
  {
    id: 'messaging',
    title: 'Queues, streams & async processing',
    body: `## Why async
Decouple producers from consumers, absorb traffic spikes, retry failures, and keep the user-facing path fast.

## Queue vs log
- **Message queue** (SQS, RabbitMQ): each message processed by one consumer, then deleted. Good for jobs/tasks.
- **Log / stream** (Kafka, Kinesis): append-only, retained, multiple consumer groups re-read independently. Good for events, fan-out, analytics. Ordered **per partition**.

## Delivery semantics
- At-most-once (may lose), at-least-once (may duplicate — make consumers **idempotent**), effectively-once (dedupe + transactions).

## Patterns
- Dead-letter queues for poison messages, exponential backoff with jitter for retries.
- Back-pressure: monitor queue depth and autoscale workers.
- Fan-out: pub/sub topics to notify many downstream services.`,
  },
  {
    id: 'realtime',
    title: 'Real-time communication',
    body: `| Technique | How it works | Use when |
|---|---|---|
| Short polling | Client asks every N seconds | Simple, low-frequency updates |
| Long polling | Server holds request until data or timeout | Fallback when sockets unavailable |
| Server-Sent Events | One-way server → client stream over HTTP | Feeds, notifications, live scores |
| WebSockets | Full-duplex persistent connection | Chat, collaboration, gaming |

## Scaling persistent connections
- Each gateway server holds many (100K+) connections; keep them **stateless beyond the socket**.
- Keep a **connection registry** (user → gateway server) in Redis, or route via pub/sub channels per user/room.
- Handle reconnects with a "last seen" cursor so clients can fetch missed messages.
- Heartbeats detect dead connections; presence is derived from them.`,
  },
  {
    id: 'reliability',
    title: 'Reliability & observability',
    body: `## Failure handling
- **Timeouts** everywhere, **retries** with exponential backoff + jitter, and **circuit breakers** to stop hammering a failing dependency.
- **Bulkheads:** isolate resources so one bad dependency can't exhaust everything.
- **Graceful degradation:** serve cached/partial results rather than errors.
- **Rate limiting & load shedding** protect the system under overload.

## Redundancy
- No single points of failure: multiple instances per AZ, multi-AZ data stores, multi-region for disaster recovery.
- Define **RPO** (how much data you can lose) and **RTO** (how fast you must recover).

## Observability
- **Metrics** (RED: rate, errors, duration; USE for resources), **logs**, **distributed traces**.
- SLIs → SLOs → error budgets drive alerting.`,
  },
];
