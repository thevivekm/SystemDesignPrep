import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const typeahead: Problem = {
  id: 'typeahead',
  title: 'Search Autocomplete',
  difficulty: 'Medium',
  tags: ['Trie', 'Caching', 'Batch pipelines', 'Low latency'],
  summary: 'Suggest top search completions as the user types, in under 100 ms.',
  statement: `Design the autocomplete (typeahead) feature for a large search engine.

**Requirements**
- As the user types a prefix, return the **top 5–10 most popular** completions.
- Suggestions update with trending queries within about an hour.
- p99 latency < 100 ms end-to-end; it fires on nearly every keystroke.
- 100M daily users, ~10 searches/user/day, ~20 characters per query.
- Filter offensive suggestions.`,
  clarifyingQuestions: [
    'Only prefix matching, or also fuzzy/typo tolerance?',
    'Personalized suggestions or global only?',
    'Multiple languages?',
    'How fresh must trending queries be?',
  ],
  hints: [
    'Every keystroke is a request: estimate the QPS — it is much higher than search QPS.',
    'A trie lets you walk to a prefix node; storing the top-k results at each node avoids traversing the subtree.',
    'Don\'t update the trie on every search. Aggregate query logs offline and rebuild periodically.',
    'Client-side tricks: debounce, cache results per prefix in the browser, CDN-cache short prefixes.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Top-k by popularity; latency target; freshness' },
      { id: 'r2', text: 'QPS: 1B searches/day × ~10 keystrokes ≈ 100K+ QPS (peak more)' },
    ] },
    { section: 'Data structure', items: [
      { id: 's1', text: 'Trie with top-k cached at each node', weight: 2 },
      { id: 's2', text: 'Discusses memory size and limiting prefix length' },
      { id: 's3', text: 'Alternative: prefix → top-k in a KV store/Redis' },
    ] },
    { section: 'High-level design', items: [
      { id: 'h1', text: 'Separate query (read) path from data collection (write) path', weight: 2 },
      { id: 'h2', text: 'Log aggregation pipeline (stream/batch) computes frequencies' },
      { id: 'h3', text: 'Periodic trie build + atomic swap/deploy to serving nodes' },
      { id: 'h4', text: 'Trie sharded by prefix, replicated for read throughput' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Client debounce + browser cache + CDN for hot short prefixes' },
      { id: 'd2', text: 'Trending: time-decayed scores / near-real-time streaming counts' },
      { id: 'd3', text: 'Filtering offensive terms; blocklist applied at build time' },
      { id: 'd4', text: 'Uneven shard load (e.g. "s" vs "x") handled by smart prefix partitioning' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'client', 'Browser (debounce + cache)', 0, 60, 180],
        ['cdn', 'cdn', 'CDN (short prefixes)', 240, 0],
        ['lb', 'lb', 'Load Balancer', 240, 110],
        ['ac', 'service', 'Autocomplete service', 460, 110],
        ['tr', 'cache', 'In-memory trie shards (replicated)', 680, 110, 200],
        ['logs', 'pubsub', 'Search query log stream', 0, 280, 180],
        ['agg', 'worker', 'Aggregator (counts, decay)', 240, 280, 170],
        ['fq', 'nosql', 'Query frequency table', 460, 280],
        ['bld', 'worker', 'Trie builder (hourly)', 680, 280],
        ['ts', 'blob', 'Trie snapshots', 900, 280],
      ],
      [
        ['c', 'cdn'],
        ['c', 'lb', 'GET /suggest?q='],
        ['lb', 'ac'],
        ['ac', 'tr', 'lookup prefix'],
        ['logs', 'agg'],
        ['agg', 'fq'],
        ['fq', 'bld'],
        ['bld', 'ts'],
        ['ts', 'tr', 'load + swap'],
      ]
    ),
    markdown: `## Estimates
- 100M users × 10 searches = 1B searches/day; each fires ~5–10 suggestion requests after debounce → **~60–120K QPS** average.
- Distinct queries to keep: a few hundred million; trimmed to the top tens of millions keeps the trie in RAM (tens of GB, sharded).

## Two paths
**Query path (read, latency-critical):** client → CDN/LB → autocomplete service → in-memory trie shard → top-k list.
**Data path (offline, freshness):** search logs → stream aggregator → frequency table → periodic trie builder → snapshot → serving nodes load & atomically swap.

## Trie with cached top-k
Each node stores the **top-k completions for its prefix**, so a lookup is O(prefix length) — no subtree scan. Updates are expensive, which is why we rebuild offline instead of mutating per search.

Alternative: precompute \`prefix → [top-k]\` and store in Redis/KV; simpler to shard, more memory.

## Sharding
Shard by prefix range (e.g. a–c, d–f…), but split by **observed traffic**, not alphabet, to avoid hot shards. Replicate each shard for throughput and availability.

## Freshness & trends
- Hourly rebuild with **time-decayed** counts (recent queries weigh more).
- For breaking trends, a small real-time layer (streaming counts over the last 15 min) merges into results.

## Client-side
Debounce ~100–150 ms, cancel stale requests, cache prefix results in the browser; 1–2 char prefixes are highly cacheable at the CDN.

## Safety
Blocklist + classifier filter at build time so offensive suggestions never reach serving nodes.`,
  },
};
