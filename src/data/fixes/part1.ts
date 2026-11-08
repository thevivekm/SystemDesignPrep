import type { FixChallenge } from '../../types';
import { diagram } from '../diagram';
import { APP, DB, QUEUE, USERS, k } from './helpers';

export const fixesPart1: FixChallenge[] = [
  {
    id: 'read-heavy-db',
    title: 'Product pages melting the database',
    difficulty: 'Easy',
    topic: 'Caching',
    summary: 'Every page view hits the database directly. The DB is at 100% CPU.',
    scenario: `An online store serves product pages. Two app servers sit behind a load balancer and read product data straight from a single SQL database.

**Symptoms**
- 95% of queries are reads of the **same few thousand popular products**.
- Database CPU is pinned at 100% during sales; p99 page latency is 2.5 s.
- Product data changes only a few times per day.`,
    goal: 'Stop repeated reads from hammering the database while keeping it as the source of truth.',
    hotspots: { db: 'CPU 100%' },
    metrics: [{ label: 'DB CPU', broken: '100%', healthy: '22%' }, { label: 'p99', broken: '2.5 s', healthy: '60 ms' }, { label: 'Cache hits', broken: '0%', healthy: '96%' }],
    start: diagram(
      [
        ['users', 'client', 'Shoppers', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['app1', 'service', 'App server 1', 440, 40],
        ['app2', 'service', 'App server 2', 440, 200],
        ['db', 'sql', 'Products DB', 680, 120],
      ],
      [['users', 'lb'], ['lb', 'app1'], ['lb', 'app2'], ['app1', 'db'], ['app2', 'db']]
    ),
    checks: [
      { type: 'exists', sel: k('cache'), label: 'An in-memory layer can serve hot data' },
      { type: 'link', a: APP, b: k('cache'), label: 'App servers consult that layer before going to the database' },
      { type: 'link', a: APP, b: DB, label: 'The database is still reachable as the source of truth' },
      { type: 'reach', a: USERS, b: DB, label: 'Shoppers can still get to product data end-to-end' },
    ],
    hints: [
      'The data is read far more than it is written, and the same items are read again and again.',
      'Which component in the palette keeps hot data in memory?',
      'Use cache-aside: app server checks the cache, on a miss reads the DB and fills the cache.',
    ],
    explanation: `## Fix: cache-aside with Redis
Put a **cache** (Redis/Memcached) next to the app servers. On each read: check cache → on miss, read DB → write to cache with a TTL.

**Why it works:** popularity follows a power law, so a cache holding the top few thousand products gets a **95%+ hit rate**. The DB now only sees misses and writes.

**Details worth mentioning**
- Invalidate (delete) the cache key when a product is updated, plus a TTL as a safety net.
- Protect against a **stampede** when a hot key expires: request coalescing or a short lock.
- The cache is an optimisation — if it dies, the DB must survive the miss storm (warm-up, rate limits).`,
    solution: diagram(
      [
        ['users', 'client', 'Shoppers', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['app1', 'service', 'App server 1', 440, 40],
        ['app2', 'service', 'App server 2', 440, 200],
        ['cache', 'cache', 'Redis cache', 680, 0],
        ['db', 'sql', 'Products DB', 680, 200],
      ],
      [['users', 'lb'], ['lb', 'app1'], ['lb', 'app2'], ['app1', 'cache', 'get/set'], ['app2', 'cache'], ['app1', 'db', 'on miss'], ['app2', 'db']]
    ),
  },
  {
    id: 'single-server',
    title: 'One server, one outage',
    difficulty: 'Easy',
    topic: 'Scaling',
    summary: 'All traffic goes to a single app server. Every deploy is downtime.',
    scenario: `A startup's API runs on **one** app server that users connect to directly by its IP address.

**Symptoms**
- Every deploy causes ~2 minutes of downtime.
- Last week the server's disk failed and the whole product was down for 3 hours.
- Traffic is doubling every few months; the server is already at 70% CPU.`,
    goal: 'Remove the single point of failure in the app tier and allow it to scale horizontally.',
    hotspots: { app: 'single point of failure' },
    metrics: [{ label: 'Uptime', broken: '97.10%', healthy: '99.99%' }, { label: 'Deploy downtime', broken: '2 min', healthy: '0 min' }, { label: 'CPU', broken: '70%', healthy: '35%' }],
    start: diagram(
      [
        ['users', 'client', 'Users', 0, 100],
        ['app', 'service', 'App server', 240, 100],
        ['db', 'sql', 'Database', 480, 100],
      ],
      [['users', 'app'], ['app', 'db']]
    ),
    checks: [
      { type: 'exists', sel: k('lb', 'gateway'), label: 'There is a stable entry point that can route traffic' },
      { type: 'fanout', from: k('lb', 'gateway'), to: APP, min: 2, label: 'Traffic is spread across 2+ app server instances' },
      { type: 'noLink', a: USERS, b: APP, label: 'Users no longer connect to an individual server directly' },
      { type: 'fanout', from: DB, to: APP, min: 2, label: 'Every app instance can reach the database' },
    ],
    hints: [
      'You need more than one copy of the app server.',
      'Something has to sit in front of those copies and decide which one gets each request.',
      'With health checks, the load balancer stops sending traffic to an instance that is down or being deployed.',
    ],
    explanation: `## Fix: load balancer + multiple stateless instances
- Run **2+ identical app servers** (ideally in different availability zones).
- Put a **load balancer** in front; users connect to its DNS name, never to a server.
- LB **health checks** remove unhealthy instances; **rolling deploys** update one instance at a time → zero downtime.
- App servers must be **stateless** (sessions in a shared store) so any instance can serve any request.

The database is now the remaining single point of failure — the next step is a replica with failover.`,
    solution: diagram(
      [
        ['users', 'client', 'Users', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['app1', 'service', 'App server A', 440, 40],
        ['app2', 'service', 'App server B', 440, 200],
        ['db', 'sql', 'Database', 680, 120],
      ],
      [['users', 'lb'], ['lb', 'app1'], ['lb', 'app2'], ['app1', 'db'], ['app2', 'db']]
    ),
  },
  {
    id: 'client-direct-db',
    title: 'Mobile app talks to the database',
    difficulty: 'Easy',
    topic: 'Security & layering',
    summary: 'The mobile app ships with database credentials and queries the DB directly.',
    scenario: `To move fast, a team made their mobile app connect **directly to the production database** using credentials embedded in the app binary.

**Symptoms**
- Someone extracted the credentials from the app and dumped the users table.
- Changing the schema breaks every old app version still installed.
- 200K phones each hold an open DB connection; the DB hits its connection limit.`,
    goal: 'Put a proper boundary between clients and the database.',
    hotspots: { db: '200K open connections', app: 'creds leaked' },
    metrics: [{ label: 'DB connections', broken: '200000', healthy: '120' }, { label: 'Exposed DB creds', broken: 'yes', healthy: 'no' }],
    start: diagram(
      [
        ['app', 'mobile', 'Mobile app', 0, 100],
        ['db', 'sql', 'Production DB', 300, 100],
      ],
      [['app', 'db', 'SQL over internet']]
    ),
    checks: [
      { type: 'noLink', a: USERS, b: DB, label: 'Clients no longer hold database connections' },
      { type: 'through', a: USERS, via: APP, b: DB, label: 'Clients reach data only through a server-side API that owns database access' },
    ],
    hints: [
      'Clients should never be trusted with database credentials.',
      'Introduce a backend that exposes a narrow API and enforces auth.',
    ],
    explanation: `## Fix: an API layer owns the data
- Clients call an **API service** over HTTPS with user tokens; only the service has DB credentials.
- The API enforces **authentication, authorisation, validation** and exposes only the operations clients need.
- It **decouples schema from clients** — you can change tables without breaking old app versions.
- A handful of API servers use a **connection pool**, instead of 200K phones each holding a connection.

Add an LB and multiple instances once it needs to scale.`,
    solution: diagram(
      [
        ['app', 'mobile', 'Mobile app', 0, 100],
        ['lb', 'lb', 'Load Balancer', 200, 100],
        ['api', 'service', 'API service', 400, 100],
        ['db', 'sql', 'Production DB', 620, 100],
      ],
      [['app', 'lb', 'HTTPS + token'], ['lb', 'api'], ['api', 'db', 'pooled']]
    ),
  },
  {
    id: 'sync-email',
    title: 'Sign-ups stuck waiting on email',
    difficulty: 'Easy',
    topic: 'Async processing',
    summary: 'The sign-up request calls the email provider inline and fails when it is slow.',
    scenario: `When a user signs up, the signup service writes the user to the database and then **calls the email provider synchronously** to send a welcome email before responding.

**Symptoms**
- The email provider sometimes takes 3–8 s → sign-up takes 3–8 s.
- When the provider has an outage, **sign-ups fail** even though the user row was written.
- Retrying the request creates duplicate accounts.`,
    goal: 'Make sign-up fast and reliable even when the email provider is slow or down.',
    hotspots: { mail: 'slow 3–8 s', svc: 'requests blocked' },
    metrics: [{ label: 'Signup p99', broken: '6.8 s', healthy: '120 ms' }, { label: 'Failed signups', broken: '4.2%', healthy: '0.0%' }],
    start: diagram(
      [
        ['users', 'client', 'Users', 0, 100],
        ['lb', 'lb', 'Load Balancer', 200, 100],
        ['svc', 'service', 'Signup service', 400, 100],
        ['db', 'sql', 'Users DB', 640, 20],
        ['mail', 'external', 'Email provider', 640, 180],
      ],
      [['users', 'lb'], ['lb', 'svc'], ['svc', 'db'], ['svc', 'mail', 'sync call']]
    ),
    checks: [
      { type: 'noLink', a: APP, b: k('external'), label: 'The sign-up request no longer waits on the email provider' },
      { type: 'via', a: APP, via: QUEUE, b: k('worker'), label: 'Sign-up hands email jobs to a buffer that a background process drains' },
      { type: 'link', a: k('worker'), b: k('external'), label: 'A background process sends the email (and can retry)' },
      { type: 'link', a: APP, b: DB, label: 'User records are still saved by the service' },
    ],
    hints: [
      'Does the user need the email to be sent before they see "Welcome"?',
      'Decouple: the request should only record that an email needs sending.',
      'Message Queue + Worker: the worker calls the provider with retries and backoff.',
    ],
    explanation: `## Fix: queue + background worker
1. Signup service writes the user and **enqueues** a \`SendWelcomeEmail\` job, then responds immediately.
2. A **worker** pool consumes the queue and calls the email provider, with **retries + exponential backoff**, and a **dead-letter queue** for permanent failures.

**Reliability details**
- Use the **outbox pattern** (write the job to an outbox table in the same DB transaction) so you never create a user without its email job.
- At-least-once delivery → make sending **idempotent** (dedupe by user ID).
- Make sign-up itself idempotent (unique email constraint / idempotency key) to stop duplicate accounts.`,
    solution: diagram(
      [
        ['users', 'client', 'Users', 0, 100],
        ['lb', 'lb', 'Load Balancer', 200, 100],
        ['svc', 'service', 'Signup service', 400, 100],
        ['db', 'sql', 'Users DB', 640, 0],
        ['q', 'queue', 'Email job queue', 640, 120],
        ['w', 'worker', 'Email workers', 640, 240],
        ['mail', 'external', 'Email provider', 880, 240],
      ],
      [['users', 'lb'], ['lb', 'svc'], ['svc', 'db'], ['svc', 'q', 'enqueue'], ['q', 'w'], ['w', 'mail', 'retry/backoff']]
    ),
  },
  {
    id: 'images-in-db',
    title: 'Photos stored in the database',
    difficulty: 'Medium',
    topic: 'Storage & CDN',
    summary: 'Image bytes are stored in SQL rows and served through the app servers.',
    scenario: `A recipe site lets users upload photos. Photos are stored as **BLOB columns in the SQL database** and every image request goes LB → app server → DB.

**Symptoms**
- The database has grown to 4 TB; backups take 9 hours.
- Users in Asia and Europe wait 1–2 s per image (servers are in the US).
- App servers spend most of their CPU and bandwidth shovelling image bytes.`,
    goal: 'Store and deliver images with components built for large files and global delivery.',
    hotspots: { db: '4 TB · 9 h backups', app: 'CPU 92%' },
    metrics: [{ label: 'Image load (Asia)', broken: '1.6 s', healthy: '40 ms' }, { label: 'App CPU', broken: '92%', healthy: '18%' }, { label: 'DB size', broken: '4 TB', healthy: '60 GB' }],
    start: diagram(
      [
        ['users', 'client', 'Users (global)', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['app', 'service', 'App servers', 440, 120],
        ['db', 'sql', 'SQL DB (rows + image BLOBs)', 680, 120, 200],
      ],
      [['users', 'lb', 'pages + images'], ['lb', 'app'], ['app', 'db']]
    ),
    checks: [
      { type: 'exists', sel: k('blob'), label: 'Image bytes live in storage designed for large files' },
      { type: 'link', a: APP, b: k('blob'), label: 'The app writes uploads to that storage (DB keeps only metadata)' },
      { type: 'link', a: USERS, b: k('cdn'), label: 'Users download images from edge locations close to them' },
      { type: 'link', a: k('cdn'), b: k('blob'), label: 'The edge cache fetches from the image store on a miss' },
    ],
    hints: [
      'Databases are great for small structured rows, not multi-MB files.',
      'Object storage (S3-like) is cheap, durable, and serves files over HTTP.',
      'Images rarely change — perfect for caching at the edge.',
    ],
    explanation: `## Fix: object storage + CDN
- Store image bytes in **object storage**; the DB keeps only metadata (\`photo_id, owner, object_key, width, height\`).
- Uploads: the app hands out a **pre-signed URL** so the client uploads directly to object storage — app servers stop handling bytes.
- Delivery: images are served from a **CDN** whose origin is the object store. Users get them from a nearby edge; cache hit rates are very high because images are immutable (use content-hashed keys).

**Result:** DB shrinks to GBs (fast backups), app servers handle only API calls, and global image latency drops to tens of ms.`,
    solution: diagram(
      [
        ['users', 'client', 'Users (global)', 0, 160],
        ['cdn', 'cdn', 'CDN', 220, 20],
        ['lb', 'lb', 'Load Balancer', 220, 160],
        ['app', 'service', 'App servers', 440, 160],
        ['s3', 'blob', 'Object storage', 440, 20],
        ['db', 'sql', 'SQL DB (metadata)', 680, 160],
      ],
      [['users', 'cdn', 'GET images'], ['cdn', 's3', 'origin'], ['users', 'lb', 'API'], ['lb', 'app'], ['app', 's3', 'pre-signed upload'], ['app', 'db']]
    ),
  },
  {
    id: 'db-spof',
    title: 'The database is a single point of failure',
    difficulty: 'Medium',
    topic: 'Replication',
    summary: 'One database instance with no copy. When it died, everything stopped.',
    scenario: `The app tier is already load-balanced across several servers, but there is exactly **one database instance**.

**Symptoms**
- The DB host had a hardware failure: **40-minute outage** while restoring from last night's backup.
- **6 hours of orders were lost** (everything since the backup).
- Read traffic is also growing; the DB is at 75% CPU from reads.`,
    goal: 'Make the data tier survive the loss of a database machine and spread read load.',
    hotspots: { db: 'single point of failure' },
    metrics: [{ label: 'Recovery time', broken: '40 min', healthy: '30 s' }, { label: 'Data loss window', broken: '6 h', healthy: '0 s' }, { label: 'Primary CPU', broken: '75%', healthy: '38%' }],
    start: diagram(
      [
        ['users', 'client', 'Users', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['app1', 'service', 'App server A', 440, 40],
        ['app2', 'service', 'App server B', 440, 200],
        ['db', 'sql', 'Primary DB', 680, 120],
      ],
      [['users', 'lb'], ['lb', 'app1'], ['lb', 'app2'], ['app1', 'db'], ['app2', 'db']]
    ),
    checks: [
      { type: 'exists', sel: k('sql', 'nosql'), min: 2, label: 'There is more than one copy of the database' },
      { type: 'link', a: DB, b: DB, label: 'The copies are kept in sync (replication link between them)' },
      { type: 'fanout', from: APP, to: DB, min: 2, label: 'App servers can use more than one database node (reads / failover)' },
    ],
    hints: [
      'Backups are not high availability — you need a live copy.',
      'Add a replica that continuously receives changes from the primary.',
      'Replicas can also serve read queries.',
    ],
    explanation: `## Fix: primary + replicas with automatic failover
- Add one or more **replicas** that stream the primary's write-ahead log (replication).
- Use **synchronous** replication to at least one replica (in another AZ) for **zero data loss**, or async for lower write latency (small loss window).
- A failover manager promotes a replica if the primary dies → recovery in seconds, not hours.
- Send **read-only queries** to replicas to relieve the primary — but be aware of **replication lag** (read-your-own-writes should go to the primary).

Keep backups too — they protect against bad deletes, which replication happily copies.`,
    solution: diagram(
      [
        ['users', 'client', 'Users', 0, 120],
        ['lb', 'lb', 'Load Balancer', 220, 120],
        ['app1', 'service', 'App server A', 440, 40],
        ['app2', 'service', 'App server B', 440, 200],
        ['db', 'sql', 'Primary (writes)', 700, 40],
        ['rep', 'sql', 'Replica (reads, failover)', 700, 200, 170],
      ],
      [['users', 'lb'], ['lb', 'app1'], ['lb', 'app2'], ['app1', 'db', 'writes'], ['app2', 'db'], ['app1', 'rep', 'reads'], ['app2', 'rep'], ['db', 'rep', 'replication']]
    ),
  },
  {
    id: 'sticky-sessions',
    title: 'Users randomly logged out',
    difficulty: 'Easy',
    topic: 'Stateless services',
    summary: 'Sessions live in app-server memory behind a round-robin load balancer.',
    scenario: `Each app server keeps logged-in sessions **in its own memory**. The load balancer uses round-robin.

**Symptoms**
- Users get randomly logged out or see an empty cart when the next request lands on a different server.
- Every deploy or autoscale-down logs out everyone on the affected servers.
- Someone suggested sticky sessions, but load is now uneven and failures still lose sessions.`,
    goal: 'Make any app server able to handle any user\'s request.',
    hotspots: { a: 'sessions lost', b: 'sessions lost', c: 'sessions lost' },
    metrics: [{ label: 'Random logouts/h', broken: '340', healthy: '0' }, { label: 'Load skew', broken: '3.1x', healthy: '1.0x' }],
    start: diagram(
      [
        ['users', 'client', 'Users', 0, 160],
        ['lb', 'lb', 'LB (round-robin)', 220, 160],
        ['a', 'service', 'App A (sessions in RAM)', 460, 40, 180],
        ['b', 'service', 'App B (sessions in RAM)', 460, 160, 180],
        ['c', 'service', 'App C (sessions in RAM)', 460, 280, 180],
        ['db', 'sql', 'Database', 720, 160],
      ],
      [['users', 'lb'], ['lb', 'a'], ['lb', 'b'], ['lb', 'c'], ['a', 'db'], ['b', 'db'], ['c', 'db']]
    ),
    checks: [
      { type: 'exists', sel: k('cache', 'nosql'), label: 'There is a shared place to keep session state' },
      { type: 'fanout', from: k('cache', 'nosql'), to: APP, min: 3, label: 'Every app server reads sessions from the same shared store' },
      { type: 'fanout', from: k('lb'), to: APP, min: 3, label: 'The load balancer still spreads traffic across all servers' },
    ],
    hints: [
      'The problem is that state lives inside one specific server.',
      'Move the state out of the servers into something they all share.',
      'A fast key-value store (Redis) is the classic session store.',
    ],
    explanation: `## Fix: externalise session state
- Store sessions in a **shared, fast store** (Redis with replication) keyed by session ID; every app server reads/writes there.
- App servers become **stateless** → any server can serve any request, deploys and scale-downs don't log anyone out, and the LB can balance freely.
- Alternative: **signed tokens (JWT)** carry the session in the cookie — no server-side store, but revocation is harder.

Sticky sessions only hide the problem: uneven load and lost sessions on failure.`,
    solution: diagram(
      [
        ['users', 'client', 'Users', 0, 160],
        ['lb', 'lb', 'LB (any algorithm)', 220, 160],
        ['a', 'service', 'App A (stateless)', 460, 40],
        ['b', 'service', 'App B (stateless)', 460, 160],
        ['c', 'service', 'App C (stateless)', 460, 280],
        ['s', 'cache', 'Session store (Redis)', 720, 60, 170],
        ['db', 'sql', 'Database', 720, 260],
      ],
      [['users', 'lb'], ['lb', 'a'], ['lb', 'b'], ['lb', 'c'], ['a', 's'], ['b', 's'], ['c', 's'], ['a', 'db'], ['b', 'db'], ['c', 'db']]
    ),
  },
];
