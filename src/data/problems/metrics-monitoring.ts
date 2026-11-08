import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const metricsMonitoring: Problem = {
  id: 'metrics-monitoring',
  title: 'Metrics Monitoring & Alerting',
  difficulty: 'Medium',
  tags: ['Time series', 'Downsampling', 'Alerting'],
  summary: 'Collect, store, chart and alert on metrics from 100K servers.',
  statement: `Design an internal monitoring system (like Prometheus/Datadog).

**Requirements**
- Collect metrics (CPU, memory, request rate, latency, custom app metrics) from 100K servers.
- Dashboards with graphs over the last hour up to the last year.
- Alert rules ("p99 latency > 500 ms for 5 min") that notify on-call via email/SMS/pager.
- 10M active time series, each sampled every 10 s.
- Keep 1-year history (lower resolution is fine for old data).`,
  clarifyingQuestions: [
    'Push (agents send) or pull (system scrapes)?',
    'How long must full-resolution data be kept?',
    'How quickly must alerts fire?',
    'Logs and traces in scope? (Usually no — metrics only.)',
  ],
  hints: [
    '10M series / 10 s = 1M data points per second. Which storage handles that?',
    'Time-series databases compress consecutive values heavily (delta-of-delta, XOR).',
    'Downsample old data: 10 s → 1 min → 1 h resolution.',
    'A Kafka buffer between collectors and storage protects against spikes.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Collection, query, alerting, retention' },
      { id: 'r2', text: '1M points/s write; storage with compression estimated' },
    ] },
    { section: 'Data', items: [
      { id: 'd1', text: 'Data model: metric name + labels (tags) + (timestamp, value)', weight: 1 },
      { id: 'd2', text: 'Time-series DB with compression; write-optimised', weight: 2 },
      { id: 'd3', text: 'Retention + downsampling tiers', weight: 2 },
    ] },
    { section: 'Pipeline', items: [
      { id: 'p1', text: 'Push vs pull trade-off explained' },
      { id: 'p2', text: 'Collectors → Kafka → consumers → TSDB' },
      { id: 'p3', text: 'Query service with caching for dashboards' },
    ] },
    { section: 'Alerting', items: [
      { id: 'a1', text: 'Alert manager evaluates rules on an interval', weight: 2 },
      { id: 'a2', text: 'Dedup, grouping, silencing, escalation; notify via channels' },
      { id: 'a3', text: 'Monitoring the monitoring system (meta-monitoring)' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['s', 'service', '100K servers + agents', 0, 120, 170],
        ['col', 'service', 'Collectors', 230, 120],
        ['k', 'pubsub', 'Kafka', 440, 120],
        ['c', 'worker', 'Ingest consumers', 640, 120],
        ['ts', 'nosql', 'Time-series DB', 860, 120],
        ['ds', 'worker', 'Downsampler', 860, 0],
        ['cold', 'blob', 'Cold storage (old data)', 1080, 0, 170],
        ['qs', 'service', 'Query service', 860, 260],
        ['dash', 'client', 'Dashboards', 1080, 260],
        ['am', 'worker', 'Alert manager', 640, 260],
        ['n', 'external', 'Email / SMS / pager', 640, 380],
      ],
      [['s', 'col', 'metrics'], ['col', 'k'], ['k', 'c'], ['c', 'ts'], ['ts', 'ds'], ['ds', 'cold'], ['qs', 'ts'], ['dash', 'qs'], ['am', 'qs', 'eval rules'], ['am', 'n']]
    ),
    markdown: `## Data model
\`http_requests_total{service="api", region="us", status="500"}\` → stream of \`(timestamp, value)\`. Labels define the series; cardinality must be watched (never put user IDs in labels).

## Scale
10M series / 10 s = **1M points/s**. A point is ~16 B raw but compresses to ~1.5 B with delta-of-delta timestamps + XOR floats (Gorilla) → ~130 GB/day at full resolution.

## Collection
- **Pull** (Prometheus): server scrapes \`/metrics\`; easy to tell if a target is down; needs service discovery.
- **Push**: agents send to collectors; works behind firewalls and for short-lived jobs.
Either way, collectors write into **Kafka** to decouple from storage and absorb spikes.

## Storage
A **time-series DB** (write-optimised, columnar, compressed; sharded by series hash). Retention tiers:
- 10 s resolution for 7 days → 1 min for 30 days → 1 h for 1 year (downsampling jobs; old blocks to object storage).

## Query & dashboards
Query service fans out to shards, merges, caches common dashboard queries; picks resolution by time range.

## Alerting
Alert manager evaluates rules every 15–60 s via the query service; tracks \`pending → firing → resolved\`; **dedupes and groups** alerts, supports silences and on-call **escalation**, and notifies via email/SMS/pager webhooks. Run it redundantly and have an external heartbeat check (meta-monitoring) so you know if monitoring itself is down.`,
  },
};
