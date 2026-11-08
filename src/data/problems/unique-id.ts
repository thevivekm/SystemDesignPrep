import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const uniqueId: Problem = {
  id: 'unique-id',
  title: 'Unique ID Generator',
  difficulty: 'Easy',
  tags: ['IDs', 'Clocks', 'Coordination'],
  summary: 'Generate unique, roughly time-ordered 64-bit IDs across many servers.',
  statement: `Design a service (or library) that generates unique IDs for a distributed system.

**Requirements**
- IDs are **unique** across all machines and datacenters.
- IDs are **64-bit numbers** and roughly **sortable by time**.
- Generate **10,000+ IDs per second per machine** with very low latency.
- No single point of failure.`,
  clarifyingQuestions: [
    'Must IDs be strictly increasing, or only roughly time-ordered?',
    'Numeric only? What size limit?',
    'How many datacenters and machines?',
    'Is it OK if IDs reveal creation time or volume?',
  ],
  hints: [
    'Compare: DB auto-increment, UUIDs, a ticket server, and Twitter-Snowflake-style IDs.',
    'UUIDs are 128-bit and not time-sortable (v4). Why does that matter for DB indexes?',
    'Split 64 bits into: timestamp | machine ID | per-millisecond sequence.',
    'What happens if a machine\'s clock moves backwards?',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Uniqueness, 64-bit, time-sortable, throughput, availability' },
    ] },
    { section: 'Options', items: [
      { id: 'o1', text: 'Compares auto-increment / multi-master step, UUID, ticket server, Snowflake', weight: 2 },
      { id: 'o2', text: 'Explains UUID drawbacks (128-bit, random → poor index locality)' },
    ] },
    { section: 'Design', items: [
      { id: 'd1', text: 'Bit layout: sign | 41-bit ms timestamp | 10-bit machine ID | 12-bit sequence', weight: 2 },
      { id: 'd2', text: 'Capacity math: 4,096 IDs/ms/machine; ~69 years from custom epoch' },
      { id: 'd3', text: 'Machine ID assignment via config/ZooKeeper; no coordination per ID', weight: 2 },
    ] },
    { section: 'Deep dives', items: [
      { id: 'x1', text: 'Clock skew / clock going backwards: wait or refuse; use NTP' },
      { id: 'x2', text: 'Sequence overflow within a ms: wait for next ms' },
      { id: 'x3', text: 'Run as library in each service vs central service trade-off' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['s1', 'service', 'Service A + ID lib', 0, 40],
        ['s2', 'service', 'Service B + ID lib', 0, 160],
        ['zk', 'coordinator', 'ZooKeeper (machine IDs)', 260, 100, 190],
        ['n', 'note', 'ID = 0 | 41b timestamp | 5b DC | 5b worker | 12b sequence', 520, 90, 240],
      ],
      [['s1', 'zk', 'lease worker ID at startup'], ['s2', 'zk']]
    ),
    markdown: `## Options
| Approach | Pros | Cons |
|---|---|---|
| DB auto-increment | Simple | SPOF, hard to scale across DCs |
| Multi-master with step (k, k+N…) | Scales a bit | Not time-ordered across servers; adding servers is painful |
| UUID v4 | No coordination | 128-bit, random → bad B-tree locality, not sortable |
| Ticket server | Numeric, simple | SPOF / extra hop |
| **Snowflake** | 64-bit, sortable, local generation | Depends on clocks |

## Snowflake layout (64 bits)
\`0 | 41 bits ms since custom epoch | 5 bits datacenter | 5 bits worker | 12 bits sequence\`
- 41 bits of ms ≈ **69 years**.
- 1,024 workers; **4,096 IDs per ms per worker** (~4M/s).
- Generation is a local operation: read clock, bump sequence — microseconds.

## Assigning worker IDs
At startup each instance leases a unique worker ID from **ZooKeeper/etcd** (ephemeral node) or from static config. No coordination per ID.

## Edge cases
- **Sequence overflow** in one ms → spin until the next ms.
- **Clock moves backwards** (NTP adjustment) → refuse to generate (or wait) until the clock passes the last timestamp; alert.
- IDs leak creation time and approximate volume — fine for most internal uses.

## Library vs service
Embedding the generator as a library avoids a network hop and a SPOF; a central service is easier to manage but must be replicated.`,
  },
};
