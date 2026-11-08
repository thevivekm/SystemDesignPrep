import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const rateLimiter: Problem = {
  id: 'rate-limiter',
  title: 'Distributed Rate Limiter',
  difficulty: 'Easy',
  tags: ['Algorithms', 'Redis', 'API gateway'],
  summary: 'Throttle clients across a fleet of API servers with consistent limits.',
  statement: `Design a rate limiter that protects a public API served by hundreds of servers.

**Core features**
- Limit requests per client (API key, user, or IP) per rule, e.g. *100 requests/minute* on \`/search\`.
- Rules are configurable per endpoint and per customer tier.
- Over-limit requests get \`HTTP 429\` with headers telling the client when to retry.

**Constraints**
- Must add very little latency (< 1–2 ms).
- Limits apply globally across all API servers, not per server.
- 1M requests/second peak across the fleet.`,
  clarifyingQuestions: [
    'Client-side, server-side, or at the gateway/middleware?',
    'Hard limit or soft (allow small overshoot)?',
    'Throttle by user, API key, IP, or all of these?',
    'What happens if the rate limiter itself is down: fail open or fail closed?',
    'Do we need different windows (per second, minute, day) simultaneously?',
  ],
  hints: [
    'Compare token bucket, leaky bucket, fixed window, sliding window log, and sliding window counter.',
    'A centralized counter store (Redis) lets all servers share state. How do you avoid race conditions on increment?',
    'Lua scripts or atomic INCR + EXPIRE make check-and-update atomic in Redis.',
    'To save a network hop, some systems keep local counters and sync periodically — at the cost of accuracy.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Clarifies identity key (user / API key / IP) and per-rule limits' },
      { id: 'r2', text: 'Low latency, high availability; decides fail-open vs fail-closed' },
    ] },
    { section: 'Algorithm', items: [
      { id: 'g1', text: 'Explains at least two algorithms with pros/cons', weight: 2 },
      { id: 'g2', text: 'Picks one (token bucket or sliding window counter) with justification' },
      { id: 'g3', text: 'Identifies fixed-window boundary burst problem' },
    ] },
    { section: 'API & Data model', items: [
      { id: 'a1', text: 'Returns 429 with X-RateLimit-Limit / Remaining / Retry-After headers' },
      { id: 'a2', text: 'Counter key design, e.g. rl:{clientId}:{rule}:{window} with TTL' },
      { id: 'a3', text: 'Rules stored in config store and cached locally in each limiter' },
    ] },
    { section: 'High-level design', items: [
      { id: 'h1', text: 'Limiter as middleware / API gateway in front of services' },
      { id: 'h2', text: 'Shared Redis (cluster) for counters', weight: 2 },
      { id: 'h3', text: 'Atomicity: Lua script or MULTI to avoid check-then-set races', weight: 2 },
    ] },
    { section: 'Deep dives & trade-offs', items: [
      { id: 'd1', text: 'Redis sharding by client key; replication & failover' },
      { id: 'd2', text: 'Latency optimisation: local cache / batched sync and accuracy trade-off' },
      { id: 'd3', text: 'Multi-region: per-region limits vs global sync' },
      { id: 'd4', text: 'Monitoring of throttled requests and rule tuning' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'client', 'API clients', 0, 140],
        ['lb', 'lb', 'Load Balancer', 200, 140],
        ['gw', 'gateway', 'API Gateway + rate limit middleware', 400, 140, 200],
        ['redis', 'cache', 'Redis cluster (counters)', 400, 0, 200],
        ['cfg', 'nosql', 'Rules config store', 680, 0],
        ['svc', 'service', 'Backend services', 680, 140],
        ['m', 'warehouse', 'Metrics / logs', 400, 280, 200],
      ],
      [
        ['c', 'lb'],
        ['lb', 'gw'],
        ['gw', 'redis', 'Lua: check+incr'],
        ['gw', 'cfg', 'rules (cached)'],
        ['gw', 'svc', 'allowed'],
        ['gw', 'm', '429 events'],
      ]
    ),
    markdown: `## Where it runs
As middleware in the **API gateway** (or a sidecar), before requests reach business services. Each gateway instance consults a shared counter store so limits are global.

## Algorithms
| Algorithm | Pros | Cons |
|---|---|---|
| Fixed window counter | Very cheap (1 counter) | Burst of 2× at window boundaries |
| Sliding window log | Exact | Stores every timestamp — memory heavy |
| **Sliding window counter** | Cheap, smooth: \`current + previous × overlap%\` | Approximate |
| **Token bucket** | Allows controlled bursts; 2 values per key | Slightly more logic |
| Leaky bucket | Smooth output rate | Queues/drops bursts; adds latency |

**Choice:** token bucket (refill rate r, capacity b). Store \`{tokens, last_refill_ts}\` per key.

## Atomic update in Redis
A Lua script runs atomically on the shard that owns the key:
\`\`\`
tokens = min(b, tokens + (now - last) * r)
if tokens >= 1: tokens -= 1; allowed = true
save tokens, now; set TTL
\`\`\`
Key: \`rl:{apiKey}:{ruleId}\`. Redis Cluster shards by key hash, so load spreads across nodes.

## Response
\`429 Too Many Requests\` with \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`Retry-After\`.

## Rules
Stored in a config DB, pushed/cached in each gateway (refresh every few seconds). Rule = (match on endpoint/tier) → (rate, burst).

## Scale & latency
- 1M req/s → a Redis cluster of ~10–20 shards; one round trip ≈ <1 ms in-region.
- Optimization: keep a **local token allowance** per gateway and sync with Redis every N ms — fewer hops, small overshoot.
- **Failure:** if Redis is unreachable, **fail open** (let traffic through) with local per-instance limits as a safety net — availability of the API matters more than exact limits.
- **Multi-region:** enforce per-region limits (limit / regions) rather than synchronous cross-region counters.

## Trade-offs
Exactness vs latency: a centralized atomic counter is precise but adds a hop; local approximations are faster but can overshoot.`,
  },
};
