import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const distributedCache: Problem = {
  id: 'distributed-cache',
  title: 'Distributed Cache',
  difficulty: 'Medium',
  tags: ['Consistent hashing', 'Eviction', 'Replication'],
  summary: 'Build a Memcached/Redis-like in-memory cache cluster.',
  statement: `Design a distributed in-memory cache used by many services.

**Requirements**
- \`get(key)\`, \`set(key, value, ttl)\`, \`delete(key)\`.
- Store ~10 TB of hot data across many nodes; values up to 1 MB.
- Sub-millisecond latency; 10M operations/s across the cluster.
- Nodes can be added/removed with minimal data movement.
- Losing a node should not overload the backing databases.`,
  clarifyingQuestions: [
    'Is the cache allowed to lose data (pure cache) or must it be durable?',
    'Read/write ratio?',
    'Do clients connect directly to nodes or via a proxy?',
    'Do we need replication for availability?',
  ],
  hints: [
    'How does a client know which node holds a key? What happens when a node joins?',
    'Each node needs a fixed memory budget and an eviction policy.',
    'An LRU can be built from a hash map + doubly linked list.',
    'Replicas help availability and hot keys, but bring consistency questions.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'API, TTL, latency, capacity, durability expectations' },
    ] },
    { section: 'Partitioning', items: [
      { id: 'p1', text: 'Consistent hashing with virtual nodes', weight: 2 },
      { id: 'p2', text: 'Client-side routing (smart client) vs proxy trade-off' },
      { id: 'p3', text: 'Cluster membership/config service (ZooKeeper/gossip)' },
    ] },
    { section: 'Node internals', items: [
      { id: 'n1', text: 'Hash map + doubly linked list LRU; O(1) get/set', weight: 2 },
      { id: 'n2', text: 'TTL handling: lazy expiry on read + periodic sampling' },
      { id: 'n3', text: 'Memory management (slab allocation / fragmentation)' },
    ] },
    { section: 'Availability & deep dives', items: [
      { id: 'a1', text: 'Leader-follower replication per shard; failover' },
      { id: 'a2', text: 'Hot keys: replicas / local cache' },
      { id: 'a3', text: 'Protecting the DB on node loss (warm-up, request coalescing)' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['app', 'service', 'App + cache client (hash ring)', 0, 120, 200],
        ['cfg', 'coordinator', 'Config / membership', 0, 0],
        ['n1', 'cache', 'Shard A primary', 300, 0],
        ['n2', 'cache', 'Shard B primary', 300, 120],
        ['n3', 'cache', 'Shard C primary', 300, 240],
        ['r1', 'cache', 'Shard A replica', 520, 0],
        ['r2', 'cache', 'Shard B replica', 520, 120],
        ['r3', 'cache', 'Shard C replica', 520, 240],
        ['db', 'sql', 'Backing DB', 0, 260],
      ],
      [['app', 'cfg', 'ring updates'], ['app', 'n1'], ['app', 'n2'], ['app', 'n3'], ['n1', 'r1'], ['n2', 'r2'], ['n3', 'r3'], ['app', 'db', 'on miss']]
    ),
    markdown: `## Partitioning
Keys map to nodes with **consistent hashing**; each physical node owns ~100–200 **virtual nodes** for balance. Adding a node moves only ~1/N of keys.

Clients use a **smart client** library that holds the ring (pushed from a config service like ZooKeeper) and talks to nodes directly — one hop, lowest latency. A proxy (Twemproxy/Envoy) is simpler for clients but adds a hop.

## Node internals
- **LRU**: hash map (key → list node) + doubly linked list ordered by recency. get/set/evict are all O(1).
- **TTL**: check expiry on read (lazy) + background job samples keys and deletes expired ones.
- Memory: slab allocator by size class to avoid fragmentation; hard memory limit triggers eviction.
- Single-threaded event loop per core (Redis-style) or multi-threaded with striped locks.

## Availability
- Each shard has a **primary + replica** (async replication). On primary failure, config service promotes the replica and updates the ring.
- It's a cache: losing some data is fine, but a cold node can flood the DB → **warm up** replicas, use **request coalescing**, rate-limit DB fallbacks.

## Hot keys
Detect hot keys, replicate them to several nodes (read from any), or keep a tiny in-process cache in clients for a few seconds.

## Consistency
Cache is eventually consistent with the DB. Writers **delete** keys on update (cache-aside) and rely on TTLs as a backstop.`,
  },
};
