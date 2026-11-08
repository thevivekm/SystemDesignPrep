import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const collabEditor: Problem = {
  id: 'collab-editor',
  title: 'Collaborative Document Editor',
  difficulty: 'Hard',
  tags: ['OT / CRDT', 'WebSockets', 'Consistency', 'Real-time'],
  summary: 'Let many people edit the same document at once and see each other\'s changes live.',
  statement: `Design an online document editor where multiple users edit the same document simultaneously.

**Requirements**
- Real-time collaborative editing; everyone converges to the same content.
- See collaborators' cursors and selections.
- Offline edits merge when reconnecting.
- Version history and comments.
- Documents up to ~100 pages; up to 100 concurrent editors per doc (most have 1–5).
- 50M DAU.`,
  clarifyingQuestions: [
    'Rich text or plain text?',
    'Maximum concurrent editors per document?',
    'How long can a user be offline and still merge?',
    'Permissions model: owner, editor, commenter, viewer?',
    'Version history granularity?',
  ],
  hints: [
    'If two users insert at position 5 at the same time, naive "apply in arrival order" breaks. Look at Operational Transformation and CRDTs.',
    'With OT, a central server orders operations per document — route all editors of a doc to the same server.',
    'Don\'t store the full document after every keystroke: store an operation log plus periodic snapshots.',
    'Cursors/presence are ephemeral — broadcast them but don\'t persist them.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Real-time edits, convergence, cursors, offline, history, permissions' },
      { id: 'r2', text: 'Latency target for seeing others\' edits (~100–200 ms)' },
    ] },
    { section: 'Concurrency control', items: [
      { id: 'c1', text: 'Explains why naive last-write-wins / position edits conflict', weight: 1 },
      { id: 'c2', text: 'Operational Transformation or CRDT, with how it resolves conflicts', weight: 3 },
      { id: 'c3', text: 'Per-document revision numbers; client sends ops with base revision' },
    ] },
    { section: 'Architecture', items: [
      { id: 'h1', text: 'WebSocket connections to collaboration servers', weight: 1 },
      { id: 'h2', text: 'All sessions for one doc routed to one owner server (consistent hashing / registry)', weight: 2 },
      { id: 'h3', text: 'Operation log + periodic snapshots for storage', weight: 2 },
      { id: 'h4', text: 'Presence/cursors broadcast ephemerally' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Offline: queue local ops, rebase/merge on reconnect' },
      { id: 'd2', text: 'Failover of the doc owner server; recover from op log' },
      { id: 'd3', text: 'Version history built from snapshots + ops' },
      { id: 'd4', text: 'Permissions checked on connect and per op' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['u1', 'client', 'Editor A', 0, 40],
        ['u2', 'client', 'Editor B', 0, 260],
        ['lb', 'lb', 'LB (route by doc_id)', 220, 150, 170],
        ['cs', 'service', 'Collab server (doc owner, OT)', 460, 150, 200],
        ['reg', 'coordinator', 'Doc → server registry', 460, 20, 170],
        ['ol', 'nosql', 'Operation log', 740, 80],
        ['sn', 'blob', 'Snapshots', 740, 220],
        ['sw', 'worker', 'Snapshot / compaction worker', 980, 150, 190],
        ['api', 'service', 'Doc API (meta, ACL, comments)', 460, 300, 200],
        ['mdb', 'sql', 'Docs metadata / ACL', 740, 340],
      ],
      [
        ['u1', 'lb', 'WebSocket'],
        ['u2', 'lb', 'WebSocket'],
        ['lb', 'cs'],
        ['lb', 'reg'],
        ['cs', 'ol', 'append op'],
        ['cs', 'sn', 'load'],
        ['ol', 'sw'],
        ['sw', 'sn'],
        ['u1', 'api'],
        ['api', 'mdb'],
      ]
    ),
    markdown: `## The core problem
Doc is "abc". A inserts "X" at 1, B deletes index 2 at the same time. Applying both naively in different orders gives different results on different clients. We need **convergence**.

## Option 1: Operational Transformation (OT) — chosen
- Server is the single authority per document and assigns increasing **revision numbers**.
- Client sends \`op\` + \`baseRevision\`. If the server has applied newer ops since, it **transforms** the incoming op against them (e.g. shift an insert position right if an earlier insert happened before it), applies it, assigns the next revision, and broadcasts it.
- Clients likewise transform their pending local ops against incoming ones.
- Proven in production editors; requires a central ordering point per doc.

## Option 2: CRDT
- Each character gets a unique, ordered ID (e.g. RGA/Yjs/Automerge); operations commute, so any order converges — **no central server needed**, great for offline/peer-to-peer.
- Costs: metadata overhead per character, tombstones, more complex GC.

## Architecture
1. Opening a doc → client connects via **WebSocket**. LB/registry routes all sessions of \`doc_id\` to the **same collab server** (consistent hashing on doc_id, registry for overrides).
2. Collab server holds the doc in memory, applies/transforms ops, appends each op to a durable **operation log** (partitioned by doc_id, ordered by revision), then broadcasts.
3. **Snapshot worker** periodically folds ops into a snapshot (every N ops); load = latest snapshot + ops after it.
4. **Presence:** cursor positions broadcast over the same socket, never persisted.

## Failure & offline
- Owner server dies → registry reassigns doc; new server loads snapshot + op log; clients reconnect and resend unacked ops (idempotent by client op ID).
- Offline client buffers ops with its last known revision; on reconnect, server transforms them against everything that happened since (CRDT makes this simpler for long offline periods).

## History & permissions
- Version history = named snapshots + op log replay.
- ACL checked on connect and re-checked when permissions change (server kicks the session).

## Trade-offs
OT: simpler data, needs central server per doc. CRDT: decentralised and offline-friendly, heavier metadata. Both are valid; pick based on offline requirements.`,
  },
};
