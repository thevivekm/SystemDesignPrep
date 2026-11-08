import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const messageQueue: Problem = {
  id: 'message-queue',
  title: 'Distributed Message Queue',
  difficulty: 'Hard',
  tags: ['Logs', 'Partitioning', 'Replication', 'Delivery semantics'],
  summary: 'Build a Kafka-like durable, partitioned, replicated message log.',
  statement: `Design a distributed message queue / event log.

**Requirements**
- Producers publish messages to named topics; consumers read them.
- Multiple independent consumer groups can each read all messages of a topic.
- Messages are retained for a configurable time (e.g. 7 days) and can be replayed.
- Ordering preserved within a partition.
- High throughput (millions of messages/s cluster-wide), durable, highly available.
- Configurable delivery: at-most-once, at-least-once.`,
  clarifyingQuestions: [
    'Message size? (Assume ≤ 1 MB, typically ~1 KB.)',
    'Do consumers pull or does the broker push?',
    'Global ordering or per-partition ordering?',
    'Is exactly-once required?',
  ],
  hints: [
    'Model each partition as an append-only log on disk; consumers track an offset.',
    'Sequential disk I/O + OS page cache + zero-copy make logs very fast.',
    'Replicate each partition to several brokers; a leader handles writes.',
    'Acks: 0, 1 (leader), all (in-sync replicas) trade latency vs durability.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Topics, partitions, consumer groups, retention, replay, ordering' },
    ] },
    { section: 'Storage', items: [
      { id: 's1', text: 'Partition = append-only segmented log on disk with offset index', weight: 2 },
      { id: 's2', text: 'Retention by time/size by deleting old segments' },
      { id: 's3', text: 'Batching, compression, zero-copy for throughput' },
    ] },
    { section: 'Replication & availability', items: [
      { id: 'a1', text: 'Leader/follower replicas per partition; in-sync replica set', weight: 2 },
      { id: 'a2', text: 'Producer acks levels and durability trade-off', weight: 2 },
      { id: 'a3', text: 'Controller / metadata service (ZooKeeper/Raft) for leader election' },
    ] },
    { section: 'Consumers', items: [
      { id: 'c1', text: 'Pull model; consumers commit offsets', weight: 1 },
      { id: 'c2', text: 'Consumer groups: each partition assigned to one consumer in a group; rebalancing', weight: 2 },
      { id: 'c3', text: 'Delivery semantics from when offsets are committed; idempotent producer' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['p', 'service', 'Producers', 0, 140],
        ['b1', 'queue', 'Broker 1 (P0 leader, P1 follower)', 240, 20, 230],
        ['b2', 'queue', 'Broker 2 (P1 leader, P2 follower)', 240, 140, 230],
        ['b3', 'queue', 'Broker 3 (P2 leader, P0 follower)', 240, 260, 230],
        ['ctl', 'coordinator', 'Controller (Raft metadata)', 560, 380, 190],
        ['cgA', 'worker', 'Consumer group A', 580, 60],
        ['cgB', 'worker', 'Consumer group B', 580, 220],
      ],
      [['p', 'b1'], ['p', 'b2'], ['p', 'b3'], ['b1', 'b2', 'replicate'], ['b2', 'b3', 'replicate'], ['b1', 'cgA', 'pull'], ['b2', 'cgA'], ['b3', 'cgB', 'pull'], ['b2', 'cgB'], ['b3', 'ctl']]
    ),
    markdown: `## Core abstraction: the log
Topic → N **partitions**; each partition is an **append-only log** split into segment files with an offset index. Messages get a monotonically increasing **offset** per partition. Ordering is guaranteed **within a partition**; producers choose the partition by key (e.g. hash(user_id)).

Why it's fast: sequential writes, OS page cache, **batching**, compression, and **zero-copy** (sendfile) from disk to socket.

## Retention
Delete whole old segments by time/size (or log compaction: keep latest value per key). Consumers can **replay** from any retained offset.

## Replication
Each partition has a **leader** and followers on other brokers. Followers fetch from the leader; those caught up form the **ISR** (in-sync replicas).
- \`acks=0\`: fire-and-forget (may lose).
- \`acks=1\`: leader persisted (lose on leader crash before replication).
- \`acks=all\`: all ISR have it → durable; with \`min.insync.replicas=2\`.
A **controller** (Raft-based metadata quorum) tracks brokers and elects new leaders from the ISR on failure.

## Consumers
- **Pull** model: consumers fetch batches at their own pace (natural back-pressure).
- **Consumer group**: each partition is consumed by exactly one member; adding consumers (up to #partitions) scales throughput. Membership changes trigger a **rebalance**.
- Offsets are committed to an internal topic.
  - Commit **before** processing → at-most-once.
  - Commit **after** processing → at-least-once (make processing idempotent).
  - Exactly-once: idempotent producer + transactions that atomically write outputs and offsets.

## Scale
Throughput scales with partitions × brokers; rebalance partitions when adding brokers.`,
  },
};
