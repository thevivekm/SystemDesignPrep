import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const keyValueStore: Problem = {
  id: 'key-value-store',
  title: 'Distributed Key-Value Store',
  difficulty: 'Medium',
  tags: ['Consistent hashing', 'Replication', 'CAP', 'Storage engines'],
  summary: 'Build a highly available, partitioned get/put store like Dynamo.',
  statement: `Design a distributed key-value store with a simple API: \`put(key, value)\` and \`get(key)\`.

**Requirements**
- Values up to 1 MB; keys up to 256 bytes.
- Store hundreds of TB across many commodity nodes.
- Highly available for writes even during node failures and network partitions.
- Tunable consistency per request.
- Low latency (single-digit ms p99).`,
  clarifyingQuestions: [
    'Is availability or strong consistency more important?',
    'Read-heavy, write-heavy, or balanced?',
    'Do we need range scans, or only point lookups?',
    'Single datacenter or multi-region?',
    'Do we need TTLs or versioning of values?',
  ],
  hints: [
    'How do you decide which node owns a key so that adding a node does not reshuffle everything?',
    'Replicate each key to N nodes on the ring. What do R and W mean, and why does R + W > N matter?',
    'Concurrent writes to different replicas can conflict. Vector clocks or last-write-wins?',
    'How do nodes find out who is alive? How do replicas repair divergence after a failure?',
    'What does a single node\'s storage engine look like for fast writes? (commit log, memtable, SSTables)',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Chooses AP vs CP explicitly, ties to requirements', weight: 2 },
      { id: 'r2', text: 'Defines API and value size limits' },
    ] },
    { section: 'Partitioning & replication', items: [
      { id: 'p1', text: 'Consistent hashing with virtual nodes', weight: 2 },
      { id: 'p2', text: 'Replication factor N on successive ring nodes (across racks/AZs)' },
      { id: 'p3', text: 'Quorum reads/writes: R + W > N; tunable per request', weight: 2 },
    ] },
    { section: 'Consistency & conflicts', items: [
      { id: 'c1', text: 'Conflict resolution: vector clocks or LWW with timestamps; trade-offs' },
      { id: 'c2', text: 'Read repair and anti-entropy with Merkle trees' },
      { id: 'c3', text: 'Sloppy quorum + hinted handoff for temporary failures' },
    ] },
    { section: 'Cluster management', items: [
      { id: 'm1', text: 'Gossip protocol for membership and failure detection' },
      { id: 'm2', text: 'Coordinator node per request (any node can coordinate)' },
    ] },
    { section: 'Storage engine', items: [
      { id: 's1', text: 'Write path: commit log → memtable → SSTable flush' },
      { id: 's2', text: 'Read path: memtable → bloom filters → SSTables; compaction' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'client', 'Client (smart or via LB)', 0, 160, 170],
        ['coord', 'service', 'Coordinator node', 240, 160],
        ['n1', 'nosql', 'Node A (replica 1)', 480, 40],
        ['n2', 'nosql', 'Node B (replica 2)', 480, 160],
        ['n3', 'nosql', 'Node C (replica 3)', 480, 280],
        ['note', 'note', 'Ring with vnodes; key → first N clockwise nodes. W=2, R=2, N=3', 720, 150, 220],
      ],
      [
        ['c', 'coord', 'get/put'],
        ['coord', 'n1'],
        ['coord', 'n2'],
        ['coord', 'n3'],
        ['n1', 'n2', 'gossip'],
        ['n2', 'n3', 'gossip'],
      ]
    ),
    markdown: `## Choices up front
Requirement: writes must stay available during failures → **AP** system (Dynamo/Cassandra style) with **tunable consistency**.

## Partitioning
- **Consistent hashing** on a ring; each physical node owns many **virtual nodes** for even load and smooth rebalancing.
- Key → hash → first node clockwise is the owner; the next **N−1 distinct physical nodes** (in different racks/AZs) hold replicas.

## Replication & quorums
- N = 3 typical. Write succeeds after **W** acks; read returns after **R** responses.
- **R + W > N** ⇒ read and write sets overlap ⇒ reads see the latest acknowledged write (absent failures).
- W=1 for fast writes, R=1 for fast reads; R=W=2 is the balanced default.

## Conflicts
- **Vector clocks** detect concurrent versions; client or app merges (e.g. union of shopping carts).
- **Last-write-wins** is simpler but can silently drop updates (clock skew).

## Failures
- **Gossip** spreads membership and heartbeats; phi-accrual failure detection.
- **Sloppy quorum + hinted handoff:** if a replica is down, a neighbor accepts the write with a hint and hands it back on recovery.
- **Read repair:** on read, stale replicas are updated.
- **Anti-entropy:** replicas compare **Merkle trees** to sync permanently diverged ranges efficiently.

## Storage engine (per node): LSM tree
- **Write:** append to commit log (durability) → insert into in-memory **memtable** → flush to immutable sorted **SSTable** when full.
- **Read:** memtable → per-SSTable **bloom filter** (skip files without the key) → index → data block.
- **Compaction** merges SSTables, drops overwritten/deleted (tombstoned) values.

## Trade-offs
- AP gives write availability; you accept stale reads and conflict handling.
- LSM is write-optimized; reads cost more (mitigated by bloom filters and caching).`,
  },
};
