import type { FixChallenge } from '../../types';
import { diagram } from '../diagram';
import { APP, DB, QUEUE, USERS, id, k } from './helpers';

export const fixesPart2: FixChallenge[] = [
  {
    id: 'analytics-on-prod',
    title: 'Analytics queries slow down checkout',
    difficulty: 'Medium',
    topic: 'Data pipelines',
    summary: 'The BI dashboard runs huge reporting queries on the production database.',
    scenario: `The analytics team's dashboard connects **directly to the production SQL database** and runs multi-minute aggregation queries (revenue by region, cohort retention…).

**Symptoms**
- Every morning at 9 AM, checkout latency spikes from 200 ms to 6 s.
- A runaway report once locked a table and caused a 15-minute outage.
- Analysts want 3 years of history; the production DB only keeps 90 days.`,
    goal: 'Give analysts their data without heavy queries touching the production database.',
    hotspots: { db: 'locked by reports', dash: 'heavy SQL' },
    metrics: [{ label: 'Checkout p99', broken: '6.0 s', healthy: '200 ms' }, { label: 'DB CPU', broken: '98%', healthy: '35%' }],
    start: diagram(
      [
        ['users', 'client', 'Shoppers', 0, 60],
        ['app', 'service', 'Checkout service', 220, 60],
        ['db', 'sql', 'Production DB', 460, 60],
        ['dash', 'client', 'Analytics dashboard', 460, 240, 170],
      ],
      [['users', 'app'], ['app', 'db'], ['dash', 'db', 'heavy SQL']]
    ),
    checks: [
      { type: 'noLink', a: id('dash'), b: DB, label: 'Heavy analytics queries no longer run on the production database' },
      { type: 'link', a: id('dash'), b: k('warehouse'), label: 'The dashboard queries a store built for analytics' },
      { type: 'reach', a: DB, b: k('warehouse'), label: 'Production data flows into the analytics store' },
      { type: 'exists', sel: k('worker', 'pubsub', 'queue'), label: 'Data is moved by an asynchronous pipeline (stream / ETL job)' },
    ],
    hints: [
      'OLTP (transactions) and OLAP (big scans) want different databases.',
      'Copy data out of production continuously and let analysts query the copy.',
      'Change Data Capture → stream → ETL worker → data warehouse.',
    ],
    explanation: `## Fix: separate OLTP from OLAP
- Capture changes from production (**CDC** from the write-ahead log, or events published by services) into a **stream**.
- **ETL/ELT workers** transform and load them into a **data warehouse** (columnar storage: BigQuery/Snowflake/Redshift-style), which is built for large scans and keeps years of history.
- The dashboard queries only the warehouse. Production now serves only short transactional queries.

**Trade-off:** analytics data is minutes behind (eventual). If a report truly needs live numbers, serve it from a small pre-aggregated table or a read replica — never ad-hoc queries on the primary.`,
    solution: diagram(
      [
        ['users', 'client', 'Shoppers', 0, 60],
        ['app', 'service', 'Checkout service', 220, 60],
        ['db', 'sql', 'Production DB', 460, 60],
        ['cdc', 'pubsub', 'CDC stream', 460, 200],
        ['etl', 'worker', 'ETL workers', 680, 200],
        ['wh', 'warehouse', 'Data warehouse', 900, 200],
        ['dash', 'client', 'Analytics dashboard', 900, 60, 170],
      ],
      [['users', 'app'], ['app', 'db'], ['db', 'cdc', 'change log'], ['cdc', 'etl'], ['etl', 'wh'], ['dash', 'wh']]
    ),
  },
  {
    id: 'no-rate-limit',
    title: 'One customer takes down the API',
    difficulty: 'Medium',
    topic: 'Rate limiting',
    summary: 'A single client\'s runaway script floods the public API for everyone.',
    scenario: `A public REST API is used by thousands of customers. Requests go Clients → Load Balancer → API servers → DB. There is **no per-client limit**.

**Symptoms**
- One customer's buggy script sent 50K req/s; every other customer saw timeouts.
- Scrapers hammer the search endpoint around the clock.
- The team tried an in-memory counter on each API server, but with 20 servers clients get 20× the intended limit.`,
    goal: 'Enforce per-client limits consistently across the whole fleet.',
    hotspots: { a: 'overloaded', b: 'overloaded' },
    metrics: [{ label: 'Error rate', broken: '38%', healthy: '0.2%' }, { label: 'p99', broken: '9.0 s', healthy: '80 ms' }],
    start: diagram(
      [
        ['users', 'client', 'API clients', 0, 140],
        ['lb', 'lb', 'Load Balancer', 220, 140],
        ['a', 'service', 'API server 1', 440, 60],
        ['b', 'service', 'API server 2', 440, 220],
        ['db', 'sql', 'Database', 680, 140],
      ],
      [['users', 'lb'], ['lb', 'a'], ['lb', 'b'], ['a', 'db'], ['b', 'db']]
    ),
    checks: [
      { type: 'exists', sel: k('gateway'), label: 'There is a layer that can enforce per-client policies' },
      { type: 'through', a: USERS, via: k('gateway'), b: APP, label: 'Every client request has to pass through that layer' },
      { type: 'link', a: k('gateway'), b: k('cache'), label: 'Request counts live in a shared fast store, so all instances agree' },
    ],
    hints: [
      'Counting per server fails because each server only sees part of the traffic.',
      'Put the limit check at the edge, before requests reach your API servers.',
      'API Gateway + Redis counters (token bucket via an atomic Lua script).',
    ],
    explanation: `## Fix: rate limiting at the gateway with shared counters
- Route all traffic through an **API gateway** (LB → gateway → API servers, or gateway behind the LB).
- The gateway identifies the client (API key) and checks a **token bucket** stored in **Redis**, updated atomically (Lua script) so all gateway instances share one count.
- Over the limit → **429 Too Many Requests** with \`Retry-After\`; the request never reaches API servers.

**Details:** per-tier limits from config; fail-open if Redis is down (with a local fallback limit); separate stricter limits on expensive endpoints like search.`,
    solution: diagram(
      [
        ['users', 'client', 'API clients', 0, 140],
        ['lb', 'lb', 'Load Balancer', 200, 140],
        ['gw', 'gateway', 'API gateway (rate limit)', 400, 140, 180],
        ['r', 'cache', 'Redis counters', 400, 0],
        ['a', 'service', 'API server 1', 660, 60],
        ['b', 'service', 'API server 2', 660, 220],
        ['db', 'sql', 'Database', 880, 140],
      ],
      [['users', 'lb'], ['lb', 'gw'], ['gw', 'r', 'token bucket'], ['gw', 'a'], ['gw', 'b'], ['a', 'db'], ['b', 'db']]
    ),
  },
  {
    id: 'polling-chat',
    title: 'Chat app drowning in polling',
    difficulty: 'Medium',
    topic: 'Real-time',
    summary: 'Clients poll for new messages every second; 95% of responses are empty.',
    scenario: `A chat app's clients call \`GET /messages?since=...\` **every second** to check for new messages.

**Symptoms**
- 2M online users → 2M requests/s, but **95% return nothing new**.
- Messages still feel laggy (up to 1 s delay).
- The chat service and DB are scaled to 10× what the actual message volume needs.`,
    goal: 'Push new messages to online users instead of having them ask. (Use an API Gateway node to represent WebSocket gateway servers.)',
    hotspots: { chat: '2M req/s', lb: '95% empty polls' },
    metrics: [{ label: 'Requests', broken: '2.0 M/s', healthy: '40 K/s' }, { label: 'Msg delay', broken: '1000 ms', healthy: '30 ms' }],
    start: diagram(
      [
        ['users', 'mobile', 'Chat clients', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['chat', 'service', 'Chat service', 440, 120],
        ['db', 'nosql', 'Messages DB', 680, 120],
      ],
      [['users', 'lb', 'poll every 1s'], ['lb', 'chat'], ['chat', 'db']]
    ),
    checks: [
      { type: 'exists', sel: k('gateway'), label: 'Gateway servers hold persistent connections to clients' },
      { type: 'reach', a: USERS, b: k('gateway'), label: 'Clients connect to those gateways' },
      { type: 'via', a: APP, via: k('pubsub', 'queue'), b: k('gateway'), label: 'New messages are published to a channel that the gateways subscribe to' },
      { type: 'link', a: APP, b: DB, label: 'Messages are still persisted' },
    ],
    hints: [
      'Polling asks "anything new?" constantly. What if the server could tell the client instead?',
      'WebSockets keep a connection open so the server can push.',
      'The sender and recipient may be connected to different gateway servers — they need a pub/sub channel between them.',
    ],
    explanation: `## Fix: WebSocket gateways + pub/sub fan-out
- Clients open a **WebSocket** to a gateway server (via an L4 LB) and keep it open.
- When a message is sent, the chat service **persists** it, then **publishes** it to a pub/sub channel (per user or per gateway).
- The gateway holding the recipient's socket is subscribed and **pushes** the message instantly.
- On reconnect, clients fetch what they missed with \`since=lastMessageId\` — the only "poll" left.

**Result:** request volume tracks real messages, not users × seconds, and latency drops to tens of ms.`,
    solution: diagram(
      [
        ['users', 'mobile', 'Chat clients', 0, 120],
        ['lb', 'lb', 'L4 Load Balancer', 200, 120],
        ['gw', 'gateway', 'WebSocket gateways', 400, 120],
        ['chat', 'service', 'Chat service', 640, 20],
        ['ps', 'pubsub', 'Pub/Sub (per-user channels)', 640, 220, 190],
        ['db', 'nosql', 'Messages DB', 880, 20],
      ],
      [['users', 'lb', 'WebSocket'], ['lb', 'gw'], ['gw', 'chat', 'send'], ['chat', 'db'], ['chat', 'ps', 'publish'], ['ps', 'gw', 'push']]
    ),
  },
  {
    id: 'write-hotspot',
    title: 'One database can\'t take the writes',
    difficulty: 'Hard',
    topic: 'Sharding',
    summary: 'An IoT platform writes 200K events/s into a single database instance.',
    scenario: `An IoT platform ingests sensor readings. Ingest services write every reading into **one** database instance; replicas exist but only help reads.

**Symptoms**
- Write volume is 200K/s and growing; the primary maxes out at ~40K writes/s → huge ingest lag.
- The table is 30 TB; indexes no longer fit in memory.
- Vertical scaling is exhausted — it's already the biggest instance available.`,
    goal: 'Spread writes and data across several database nodes so capacity grows by adding nodes.',
    hotspots: { db: 'max 40K writes/s' },
    metrics: [{ label: 'Ingest lag', broken: '47 min', healthy: '2 s' }, { label: 'Write capacity', broken: '40 K/s', healthy: '240 K/s' }],
    start: diagram(
      [
        ['dev', 'client', 'Devices', 0, 120],
        ['lb', 'lb', 'Load Balancer', 200, 120],
        ['ing', 'service', 'Ingest service', 400, 120],
        ['db', 'nosql', 'Readings DB', 640, 120],
      ],
      [['dev', 'lb'], ['lb', 'ing'], ['ing', 'db', '200K writes/s']]
    ),
    checks: [
      { type: 'exists', sel: DB, min: 3, label: 'Data is split across 3 or more database partitions' },
      { type: 'fanout', from: k('service', 'coordinator', 'gateway'), to: DB, min: 3, label: 'Writers (or a router) can route to every partition' },
      { type: 'exists', sel: QUEUE, label: 'A durable buffer absorbs bursts between ingest and storage' },
    ],
    hints: [
      'Replicas copy all the data — they don\'t add write capacity.',
      'Partition (shard) the data by a key like device_id so each node takes a slice of the writes.',
      'A log/stream (Kafka) in front smooths bursts and lets writers batch.',
    ],
    explanation: `## Fix: partition the data + buffer the ingest
- **Shard by \`device_id\`** (hash or consistent hashing) across N database nodes; each holds ~1/N of the data and writes. Add nodes as volume grows.
- Choose the partition key from the **access pattern**: queries are "readings for device X over time" → \`(device_id, time)\` keeps one device's data together.
- Put a **stream** (Kafka, partitioned by device_id) between ingest and storage: absorbs bursts, allows batched writes, and lets storage fall behind briefly without losing data.
- Each shard still has its own replicas for availability.

**Watch for:** hot partitions (one chatty device) and rebalancing when adding shards — consistent hashing with virtual nodes limits data movement.`,
    solution: diagram(
      [
        ['dev', 'client', 'Devices', 0, 140],
        ['lb', 'lb', 'Load Balancer', 200, 140],
        ['ing', 'service', 'Ingest service', 400, 140],
        ['k', 'pubsub', 'Stream (partitioned by device)', 400, 280, 200],
        ['w', 'service', 'Writer service (routes by key)', 660, 140, 200],
        ['s1', 'nosql', 'Shard 1', 940, 20],
        ['s2', 'nosql', 'Shard 2', 940, 140],
        ['s3', 'nosql', 'Shard 3', 940, 260],
      ],
      [['dev', 'lb'], ['lb', 'ing'], ['ing', 'k'], ['k', 'w'], ['w', 's1'], ['w', 's2'], ['w', 's3']]
    ),
  },
  {
    id: 'sync-transcode',
    title: 'Video uploads time out',
    difficulty: 'Medium',
    topic: 'Async processing',
    summary: 'Upload servers transcode video inside the HTTP request.',
    scenario: `A video platform's upload service receives the file and **transcodes it into 5 resolutions inside the same HTTP request**, then saves the outputs on the server's local disk.

**Symptoms**
- Long videos take 20+ minutes → requests time out and users re-upload.
- Upload servers are pegged at 100% CPU; even small uploads queue up.
- When a server is replaced, the videos on its local disk are gone.`,
    goal: 'Make uploads quick and durable, and do transcoding separately and in parallel.',
    hotspots: { up: 'CPU 100% · timeouts' },
    metrics: [{ label: 'Upload timeouts', broken: '18%', healthy: '0%' }, { label: 'Time to accept upload', broken: '20 min', healthy: '4 s' }],
    start: diagram(
      [
        ['users', 'client', 'Creators', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['up', 'service', 'Upload + transcode service', 440, 120, 200],
        ['db', 'sql', 'Video metadata', 720, 120],
      ],
      [['users', 'lb', 'upload'], ['lb', 'up'], ['up', 'db']]
    ),
    checks: [
      { type: 'link', a: k('service', 'client'), b: k('blob'), label: 'Raw uploads are stored durably in shared storage' },
      { type: 'via', a: k('service', 'blob'), via: QUEUE, b: k('worker'), label: 'Transcoding is requested as queued jobs' },
      { type: 'link', a: k('worker'), b: k('blob'), label: 'Workers read the original and write encoded outputs to storage' },
      { type: 'link', a: APP, b: DB, label: 'Video metadata/status is still tracked' },
    ],
    hints: [
      'Users only need the upload to be accepted, not processed.',
      'Local disks are not durable storage — where should video files live?',
      'Upload → object storage → job queue → transcoding workers (scale on queue depth).',
    ],
    explanation: `## Fix: store first, transcode asynchronously
1. Client uploads (resumable, ideally via **pre-signed URL**) straight to **object storage**; metadata row \`status=processing\`.
2. A **job** is enqueued (or an object-created event fires).
3. **Transcoding workers** pull jobs, split the video into segments, encode in parallel, write renditions back to object storage, and mark the video \`ready\`.
4. Workers **autoscale on queue depth**; failed jobs retry; bad files go to a dead-letter queue.

**Result:** uploads finish as fast as the network allows, servers are no longer CPU-bound, and nothing lives on local disk.`,
    solution: diagram(
      [
        ['users', 'client', 'Creators', 0, 120],
        ['lb', 'lb', 'Load Balancer', 200, 120],
        ['up', 'service', 'Upload service', 400, 120],
        ['s3', 'blob', 'Object storage', 400, 260],
        ['q', 'queue', 'Transcode jobs', 640, 260],
        ['w', 'worker', 'Transcoding workers', 860, 260],
        ['db', 'sql', 'Video metadata', 640, 120],
      ],
      [['users', 'lb'], ['lb', 'up'], ['up', 's3', 'store original'], ['up', 'db'], ['s3', 'q', 'object created'], ['q', 'w'], ['w', 's3', 'renditions'], ['w', 'db', 'status=ready']]
    ),
  },
  {
    id: 'slow-search',
    title: 'Search with LIKE \'%term%\'',
    difficulty: 'Medium',
    topic: 'Search',
    summary: 'Product search scans 50M SQL rows with wildcard LIKE queries.',
    scenario: `A marketplace's search box runs \`SELECT … WHERE title LIKE '%term%' OR description LIKE '%term%'\` against the main SQL database (50M listings).

**Symptoms**
- Each search takes 4–12 s and does a full table scan; indexes can't help a leading wildcard.
- Search traffic spikes slow down every other query on the DB.
- Product wants typo tolerance, relevance ranking and filters by price/category.`,
    goal: 'Serve search from a purpose-built index kept in sync with the database.',
    hotspots: { db: 'full table scans' },
    metrics: [{ label: 'Search p99', broken: '8.4 s', healthy: '90 ms' }, { label: 'DB CPU', broken: '91%', healthy: '30%' }],
    start: diagram(
      [
        ['users', 'client', 'Shoppers', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['app', 'service', 'Listings service', 440, 120],
        ['db', 'sql', 'Listings DB (50M rows)', 680, 120, 180],
      ],
      [['users', 'lb'], ['lb', 'app'], ['app', 'db', "LIKE '%term%'"]]
    ),
    checks: [
      { type: 'exists', sel: k('search'), label: 'There is a full-text search index' },
      { type: 'link', a: APP, b: k('search'), label: 'Search queries are served from that index' },
      { type: 'link', a: k('search'), b: k('worker', 'pubsub', 'queue'), label: 'An asynchronous pipeline keeps the index updated' },
      { type: 'link', a: APP, b: DB, label: 'The database remains the source of truth for listings' },
    ],
    hints: [
      'Relational B-tree indexes can\'t answer "contains this word" efficiently.',
      'Search engines use an inverted index (word → list of documents).',
      'Keep the index in sync via change events (CDC) and an indexer worker.',
    ],
    explanation: `## Fix: dedicated search index fed by change events
- Add a **search engine** (Elasticsearch/OpenSearch-style) with an **inverted index** over title/description, plus fields for filters (price, category) and relevance scoring, stemming and fuzzy matching.
- Writes still go to SQL. Changes flow via **CDC/stream → indexer worker → search index** (seconds of lag is fine).
- The listings service sends search queries to the index, gets back IDs (and maybe snippets), and hydrates details from cache/DB.

**Trade-off:** the index is eventually consistent and is a second system to operate; you can always rebuild it from the DB.`,
    solution: diagram(
      [
        ['users', 'client', 'Shoppers', 0, 120],
        ['lb', 'lb', 'Load Balancer', 200, 120],
        ['app', 'service', 'Listings service', 400, 120],
        ['db', 'sql', 'Listings DB', 640, 20],
        ['cdc', 'pubsub', 'Change stream', 860, 20],
        ['idx', 'worker', 'Indexer', 860, 200],
        ['es', 'search', 'Search index', 640, 200],
      ],
      [['users', 'lb'], ['lb', 'app'], ['app', 'db', 'writes / details'], ['app', 'es', 'search'], ['db', 'cdc'], ['cdc', 'idx'], ['idx', 'es']]
    ),
  },
];
