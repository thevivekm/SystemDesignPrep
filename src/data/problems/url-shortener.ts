import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const urlShortener: Problem = {
  id: 'url-shortener',
  title: 'URL Shortener',
  difficulty: 'Easy',
  tags: ['Hashing', 'Caching', 'Read-heavy', 'Key-value'],
  summary: 'Turn long URLs into short links and redirect at massive read scale.',
  statement: `Design a service that turns a long URL into a short alias (e.g. \`sho.rt/aZ3kQ9\`) and redirects anyone who visits the alias to the original URL.

**Core features**
- Create a short link for a long URL; optionally a custom alias and an expiry date.
- Visiting the short link redirects to the original URL.
- Basic click analytics per link.

**Scale to assume**
- 100M new links per month, 100:1 read-to-write ratio.
- Redirects should feel instant (p99 < 50 ms server-side).
- Links live for 5 years by default.`,
  clarifyingQuestions: [
    'Can users pick a custom alias? Can links be edited or deleted?',
    'Should the same long URL always map to the same short code?',
    'How long do links live? Do they expire?',
    'Do we need user accounts, or is creation anonymous?',
    'How detailed must analytics be, and how fresh?',
    'Is a 301 (cacheable) or 302 (always hit us) redirect acceptable?',
  ],
  hints: [
    'Do the math: 100M writes/month is ~40 writes/s, but reads are ~4,000/s on average. Optimise the read path.',
    'A 7-character code in base62 gives 62^7 ≈ 3.5 trillion combinations — far more than 6B links over 5 years.',
    'Generating codes by hashing the URL risks collisions; a unique counter (or pre-allocated ID ranges) encoded in base62 avoids them.',
    'Redirect lookups are a perfect fit for a cache in front of a key-value store. Hot links follow a power law.',
    'Analytics should not slow down redirects — emit click events asynchronously to a queue/stream.',
  ],
  rubric: [
    {
      section: 'Requirements',
      items: [
        { id: 'r1', text: 'Lists functional requirements: create, redirect, custom alias, expiry, analytics' },
        { id: 'r2', text: 'Calls out non-functional needs: low-latency redirects, high availability, read-heavy' },
        { id: 'r3', text: 'Notes short codes must be unique and not easily guessable/enumerable (if required)' },
      ],
    },
    {
      section: 'Estimates',
      items: [
        { id: 'e1', text: 'Write QPS ≈ 40/s, read QPS ≈ 4K/s average (with peak multiplier)' },
        { id: 'e2', text: 'Storage: ~6B links × ~500 B ≈ 3 TB over 5 years' },
        { id: 'e3', text: 'Chooses code length from keyspace math (base62, 7 chars)' },
      ],
    },
    {
      section: 'API & Data model',
      items: [
        { id: 'a1', text: 'POST /urls {longUrl, alias?, expiresAt?} → {shortUrl}; GET /{code} → redirect' },
        { id: 'a2', text: 'Discusses 301 vs 302 and the effect on analytics and caching' },
        { id: 'a3', text: 'Schema: code (PK), long_url, user_id, created_at, expires_at' },
        { id: 'a4', text: 'Picks a key-value / NoSQL store (or sharded SQL) keyed by code, with reasoning' },
      ],
    },
    {
      section: 'High-level design',
      items: [
        { id: 'h1', text: 'Stateless app servers behind a load balancer', weight: 1 },
        { id: 'h2', text: 'Code generation strategy that avoids collisions (counter + base62, ID ranges, or KGS)', weight: 2 },
        { id: 'h3', text: 'Cache (e.g. Redis) on the redirect path with LRU eviction', weight: 2 },
        { id: 'h4', text: 'Click events sent asynchronously (queue/stream) to an analytics store' },
      ],
    },
    {
      section: 'Deep dives & trade-offs',
      items: [
        { id: 'd1', text: 'Handles custom alias conflicts and reserved words' },
        { id: 'd2', text: 'Expiry: lazy check on read + background cleanup job' },
        { id: 'd3', text: 'Sharding strategy for the store (hash of code) and replication for availability' },
        { id: 'd4', text: 'Abuse prevention: rate limiting creation, malicious URL checks' },
        { id: 'd5', text: 'Hash-based vs counter-based generation trade-off explained' },
      ],
    },
  ],
  reference: {
    diagram: diagram(
      [
        ['client', 'client', 'Browser / App', 0, 160],
        ['lb', 'lb', 'Load Balancer', 220, 160],
        ['api', 'service', 'URL Service (stateless)', 440, 160, 170],
        ['cache', 'cache', 'Redis cache (code → URL)', 440, 20, 170],
        ['db', 'nosql', 'KV store (sharded by code)', 700, 160, 180],
        ['kgs', 'coordinator', 'ID range allocator', 700, 20, 170],
        ['q', 'pubsub', 'Click event stream', 440, 320, 170],
        ['an', 'worker', 'Analytics consumers', 700, 320, 170],
        ['wh', 'warehouse', 'Analytics store', 940, 320],
      ],
      [
        ['client', 'lb', 'HTTPS'],
        ['lb', 'api'],
        ['api', 'cache', 'lookup'],
        ['api', 'db', 'miss / write'],
        ['api', 'kgs', 'lease ID block'],
        ['api', 'q', 'click event'],
        ['q', 'an'],
        ['an', 'wh'],
      ]
    ),
    markdown: `## 1. Requirements
- **Functional:** create short link (optional alias, expiry), redirect, per-link click stats.
- **Non-functional:** redirects p99 < 50 ms, 99.99% availability, links durable for years. Extremely **read-heavy** (100:1).

## 2. Estimates
| Metric | Value |
|---|---|
| Writes | 100M/month ≈ **40/s** (peak ~200/s) |
| Reads | 100× ≈ **4,000/s** (peak ~20K/s) |
| Records (5 yrs) | ~6B |
| Storage | 6B × 500 B ≈ **3 TB** |

Base62 with 7 chars → 62⁷ ≈ 3.5T codes: plenty.

## 3. API
\`\`\`
POST /v1/urls        { longUrl, customAlias?, expiresAt? }  → 201 { shortUrl }
GET  /{code}         → 302 Location: <longUrl>
GET  /v1/urls/{code}/stats
\`\`\`
**302 vs 301:** 301 is cached by browsers (less load, but we lose analytics). Use **302** if click analytics matter.

## 4. Data model
\`urls(code PK, long_url, owner_id, created_at, expires_at)\` in a horizontally-scalable KV store (DynamoDB/Cassandra-style) partitioned by \`code\`. Lookups are always by primary key, so no joins needed.

## 5. Code generation
- **Counter + base62 (chosen):** each app server leases a block of IDs (e.g. 1M at a time) from a coordinator (ZooKeeper / a DB row). It encodes IDs locally — no collisions, no coordination per request.
- **Hash (MD5/SHA) + truncate:** simple, but collisions must be detected and retried; same URL → same code (may be desired).
- To avoid guessable sequential codes, shuffle the ID with a reversible permutation (e.g. multiply by a large prime mod 62⁷) before encoding.
- Custom aliases: conditional write ("insert if not exists") and a reserved-word list.

## 6. Read path
1. LB → stateless service.
2. Check **Redis** (code → URL). Hot links follow a power law; 20% of links ≈ 80% of traffic, so a modest cache gives a very high hit rate.
3. On miss, read the KV store, populate cache, return 302.
4. Publish a click event to a stream (Kafka) **asynchronously** — never block the redirect.

## 7. Deep dives
- **Expiry:** check \`expires_at\` on read (return 410) + nightly job that deletes expired rows and frees aliases.
- **Availability:** replicate store across AZs; cache is a performance layer, not the source of truth.
- **Abuse:** rate-limit creation per user/IP, scan URLs against a malware list.
- **Analytics:** consumers aggregate clicks per code/day into a warehouse or a counter table.

## 8. Trade-offs
- KV store over SQL: simpler scaling for single-key lookups; we give up ad-hoc queries (served from the analytics store instead).
- 302 costs more traffic but keeps analytics accurate.`,
  },
};
