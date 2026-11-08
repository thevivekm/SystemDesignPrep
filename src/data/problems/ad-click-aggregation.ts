import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const adClickAggregation: Problem = {
  id: 'ad-click-aggregation',
  title: 'Ad Click Aggregator',
  difficulty: 'Medium',
  tags: ['Stream processing', 'Kafka', 'Windowing', 'OLAP'],
  summary: 'Count billions of ad clicks per minute for billing and dashboards.',
  statement: `Design a system that aggregates ad click events.

**Requirements**
- Clicks redirect users to the advertiser's site and are recorded.
- Advertisers query click counts per ad over the last M minutes, and the top 100 ads per minute.
- Results within ~1 minute of the click; counts must be accurate (used for billing).
- 1B clicks/day, peak 50K clicks/s.
- Filter fraudulent/duplicate clicks.`,
  clarifyingQuestions: [
    'What granularity do queries need (minute, hour, day)?',
    'How long do we keep raw events vs aggregates?',
    'Can late events (mobile offline) arrive hours later?',
    'Is exactly-once counting required for billing?',
  ],
  hints: [
    'Write raw events to a durable log first; aggregate in a stream processor.',
    'Tumbling windows per minute, keyed by ad_id. What about late events? (watermarks)',
    'Exactly-once: idempotent sinks + dedupe by click ID.',
    'Keep the raw events so you can recompute (reconcile with a batch job).',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Counts per ad/min, top-N, freshness, billing accuracy' },
      { id: 'r2', text: '50K events/s peak; raw ≈ 1B × 100 B = 100 GB/day' },
    ] },
    { section: 'Pipeline', items: [
      { id: 'p1', text: 'Click service logs event → Kafka (durable log)', weight: 2 },
      { id: 'p2', text: 'Stream processor (Flink) aggregates per ad per minute', weight: 2 },
      { id: 'p3', text: 'Aggregates stored in OLAP/time-series DB for queries' },
      { id: 'p4', text: 'Raw events archived to object storage' },
    ] },
    { section: 'Correctness', items: [
      { id: 'c1', text: 'Event time vs processing time; watermarks for late events', weight: 2 },
      { id: 'c2', text: 'Dedupe by click_id; exactly-once via checkpoints + idempotent writes' },
      { id: 'c3', text: 'Batch reconciliation job (lambda/kappa) to correct counts' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'x1', text: 'Hot ads: pre-aggregate / split keys' },
      { id: 'x2', text: 'Top-100 per minute via per-window heap' },
      { id: 'x3', text: 'Fraud filtering (rate per IP/device, bots)' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['u', 'client', 'Users click ads', 0, 120],
        ['cs', 'service', 'Click / redirect service', 200, 120, 170],
        ['k', 'pubsub', 'Kafka: raw clicks', 440, 120],
        ['f', 'worker', 'Flink: dedupe + 1-min windows', 660, 40, 200],
        ['olap', 'warehouse', 'OLAP DB (aggregates)', 940, 40],
        ['s3', 'blob', 'Raw event archive', 660, 220],
        ['b', 'worker', 'Batch reconciliation', 940, 220],
        ['q', 'service', 'Query API / dashboards', 940, 360, 170],
      ],
      [['u', 'cs'], ['cs', 'k'], ['k', 'f'], ['f', 'olap'], ['k', 's3'], ['s3', 'b'], ['b', 'olap', 'corrections'], ['q', 'olap']]
    ),
    markdown: `## Flow
1. User clicks → **click service** records \`{click_id, ad_id, user/device, ip, ts}\` and redirects (302) to the advertiser.
2. Event is appended to **Kafka** (partitioned by ad_id) — durable buffer, replayable.
3. **Stream processor** (Flink) dedupes by click_id, filters fraud, aggregates **per ad per 1-minute tumbling window** (event time), and computes per-window top-100 with a heap.
4. Results go to an **OLAP / time-series store** (Druid/ClickHouse/Pinot) → dashboards and billing queries.
5. Raw events are also archived to **object storage**.

## Correctness
- **Event time** + **watermarks**: windows close after allowing, say, 2 minutes of lateness; very late events are handled by reconciliation.
- **Exactly-once**: Flink checkpoints with Kafka offsets + idempotent upserts keyed by \`(ad_id, window)\`.
- **Reconciliation**: a daily batch job recomputes from raw events and corrects aggregates — billing uses reconciled numbers.

## Scale
50K/s is modest for Kafka/Flink; hot ads get a two-stage aggregation (local pre-aggregate, then global).

## Storage
Aggregates: 1B clicks → maybe 10M ad-minute rows/day — small. Raw: ~100 GB/day compressed in cold storage.`,
  },
};
