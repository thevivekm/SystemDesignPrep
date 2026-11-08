import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const webCrawler: Problem = {
  id: 'web-crawler',
  title: 'Web Crawler',
  difficulty: 'Medium',
  tags: ['Queues', 'Politeness', 'Dedup', 'Batch'],
  summary: 'Crawl billions of web pages politely and efficiently for a search index.',
  statement: `Design a web crawler that downloads pages for a search engine index.

**Requirements**
- Start from a set of seed URLs and follow links.
- Crawl ~1 billion pages per month; re-crawl pages periodically based on how often they change.
- Be **polite**: respect \`robots.txt\` and don't overload any single host.
- Avoid storing duplicate content.
- Robust to traps, malformed HTML, slow servers.`,
  clarifyingQuestions: [
    'HTML only, or also images/PDFs?',
    'How fresh must the index be? How often do we revisit?',
    'Do we need to render JavaScript?',
    'How long do we keep downloaded pages?',
    'Which domains or languages are in scope?',
  ],
  hints: [
    '1B pages/month ≈ 400 pages/s. With 500 KB avg, that is ~200 MB/s of download bandwidth.',
    'The "URL frontier" is the heart of the design: it needs prioritization AND per-host politeness.',
    'Use per-host queues so that only one worker fetches from a host at a time, with a delay.',
    'Two kinds of dedup: URLs already seen (bloom filter / set) and content already seen (hash/fingerprint).',
    'DNS resolution can become a bottleneck — cache it.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Scope: HTML, politeness, freshness, dedup' },
      { id: 'r2', text: '~400 pages/s, ~200 MB/s bandwidth, ~500 TB/month storage' },
    ] },
    { section: 'High-level design', items: [
      { id: 'h1', text: 'Pipeline: frontier → fetcher → parser → link extractor → back to frontier', weight: 2 },
      { id: 'h2', text: 'Raw pages stored in object/blob storage; metadata in DB' },
      { id: 'h3', text: 'DNS resolver cache' },
    ] },
    { section: 'URL frontier', items: [
      { id: 'f1', text: 'Priority queues (by importance/PageRank/freshness)', weight: 2 },
      { id: 'f2', text: 'Per-host back queues and delay for politeness', weight: 2 },
      { id: 'f3', text: 'robots.txt fetched, cached, and respected' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'URL dedup with normalization + bloom filter / distributed set' },
      { id: 'd2', text: 'Content dedup via checksum or SimHash for near-duplicates' },
      { id: 'd3', text: 'Crawler traps: max depth, URL length, per-host page limits' },
      { id: 'd4', text: 'Re-crawl scheduling based on change frequency' },
      { id: 'd5', text: 'Fault tolerance: checkpoint frontier, idempotent workers, partition by host' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['seed', 'note', 'Seed URLs', 0, 0, 120],
        ['fr', 'queue', 'URL Frontier (priority + per-host queues)', 0, 120, 220],
        ['fe', 'worker', 'Fetchers', 300, 120],
        ['dns', 'cache', 'DNS cache', 300, 0],
        ['rb', 'cache', 'robots.txt cache', 520, 0],
        ['blob', 'blob', 'Raw page store', 520, 120],
        ['pa', 'worker', 'Parser + content dedup', 520, 250, 170],
        ['le', 'worker', 'Link extractor + URL filter', 300, 250, 170],
        ['seen', 'cache', 'Seen-URL bloom filter', 0, 250, 170],
        ['meta', 'nosql', 'URL metadata DB', 760, 250],
        ['idx', 'search', 'Indexer (downstream)', 760, 120],
      ],
      [
        ['seed', 'fr'],
        ['fr', 'fe', 'next URL'],
        ['fe', 'dns'],
        ['fe', 'rb'],
        ['fe', 'blob', 'store HTML'],
        ['blob', 'pa'],
        ['pa', 'le'],
        ['le', 'seen', 'new?'],
        ['seen', 'fr', 'enqueue'],
        ['pa', 'meta'],
        ['blob', 'idx'],
      ]
    ),
    markdown: `## Estimates
- 1B pages/month ≈ **400 pages/s** (peak ~1K/s).
- 500 KB avg → **~200 MB/s** ingress, **~500 TB/month** raw (compress & dedup).

## Pipeline
1. **URL frontier** hands out the next URL to fetch.
2. **Fetcher** resolves DNS (cached), checks **robots.txt** (cached per host), downloads with timeouts and size limits.
3. Raw HTML → **blob storage**; metadata (url, fetched_at, checksum, status) → DB.
4. **Parser** extracts text and links; computes content fingerprint (**SimHash**) to drop near-duplicates.
5. **Link extractor** normalizes URLs (lowercase host, strip fragments, resolve relative), filters (blocklist, depth, length), checks the **seen-URL set** (bloom filter + persistent store), and enqueues new ones.

## URL frontier (the interesting part)
- **Front queues by priority:** importance (PageRank, domain authority), freshness need. A selector biases towards high priority.
- **Back queues by host:** each host maps to exactly one back queue; a heap tracks the **earliest time each host may be fetched next** (politeness delay, e.g. ≥1 s or based on response time).
- Each fetcher thread pulls from one back queue at a time → never hammers a host.
- Frontier is partitioned across machines by **hash(host)** so a host's URLs live on one node; persisted to disk with in-memory buffers.

## Robustness
- **Traps:** max depth, max pages per host, max URL length, detect repeating path segments.
- **Faults:** workers are stateless and idempotent; frontier checkpoints; retry with backoff; dead hosts are deprioritized.

## Freshness
Track change rate per URL (did the checksum change since last crawl?). Revisit fast-changing pages more often; use \`If-Modified-Since\`/ETags to save bandwidth.

## Trade-offs
- Bloom filters are memory-efficient but have false positives (skip a few new URLs) — acceptable.
- JS rendering (headless browsers) is ~10–100× more expensive; do it only for selected domains.`,
  },
};
