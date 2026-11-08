import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const chat: Problem = {
  id: 'chat',
  title: 'Chat / Messaging App',
  difficulty: 'Medium',
  tags: ['WebSockets', 'Real-time', 'Wide-column DB', 'Presence'],
  summary: 'One-to-one and group messaging with delivery receipts and online status.',
  statement: `Design a mobile messaging app.

**Requirements**
- 1:1 and group chats (up to 500 members).
- Real-time delivery when the recipient is online; delivered later (with push notification) when offline.
- Message status: sent, delivered, read.
- Online/last-seen presence.
- Message history synced across a user's devices.
- 500M DAU, 40 messages/user/day.`,
  clarifyingQuestions: [
    'End-to-end encryption required?',
    'Media messages (images/video) in scope?',
    'How long is history kept? Forever?',
    'Message ordering guarantees per chat?',
    'Max group size?',
  ],
  hints: [
    'HTTP polling is wasteful here — keep a persistent connection (WebSocket) per online device.',
    'A message arrives at gateway A, but the recipient is connected to gateway B. How does A find B?',
    'Store messages partitioned by chat ID and sorted by a per-chat sequence/time ID.',
    'Group messages: fan-out per member, but don\'t store the message body N times.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: '1:1, groups, receipts, presence, offline delivery, multi-device' },
      { id: 'r2', text: '20B messages/day ≈ 230K msg/s; storage ≈ 20B × 100 B ≈ 2 TB/day' },
    ] },
    { section: 'Connectivity', items: [
      { id: 'c1', text: 'WebSocket gateway servers holding persistent connections', weight: 2 },
      { id: 'c2', text: 'Session/connection registry (user/device → gateway) in Redis', weight: 2 },
      { id: 'c3', text: 'Heartbeats + reconnect with last-received cursor' },
    ] },
    { section: 'Messaging & storage', items: [
      { id: 'm1', text: 'Chat service assigns per-chat monotonic message IDs (ordering)' },
      { id: 'm2', text: 'Messages in wide-column store partitioned by chat_id, clustered by msg_id', weight: 2 },
      { id: 'm3', text: 'Offline: push notification + sync on reconnect' },
      { id: 'm4', text: 'Group fan-out via queue; message stored once' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Delivered/read receipts as lightweight messages; per-user read cursor' },
      { id: 'd2', text: 'Presence via heartbeats; fan-out only to interested contacts / lazily' },
      { id: 'd3', text: 'Idempotent sends with client-generated message IDs (dedup on retry)' },
      { id: 'd4', text: 'Media uploaded to object storage; message contains a reference' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['a', 'mobile', 'Sender', 0, 60],
        ['b', 'mobile', 'Recipient', 0, 280],
        ['lb', 'lb', 'LB (sticky TCP)', 200, 170],
        ['g1', 'gateway', 'WS Gateway A', 400, 60],
        ['g2', 'gateway', 'WS Gateway B', 400, 280],
        ['cs', 'service', 'Chat service', 620, 170],
        ['reg', 'cache', 'Connection registry', 620, 20],
        ['db', 'nosql', 'Messages (by chat_id)', 860, 170, 170],
        ['q', 'pubsub', 'Fan-out / per-gateway topics', 620, 320, 190],
        ['push', 'external', 'Push (APNs/FCM)', 860, 320],
        ['pr', 'cache', 'Presence store', 860, 20],
      ],
      [
        ['a', 'lb', 'WebSocket'],
        ['b', 'lb', 'WebSocket'],
        ['lb', 'g1'],
        ['lb', 'g2'],
        ['g1', 'cs', 'send msg'],
        ['cs', 'db', 'persist'],
        ['cs', 'reg', 'where is B?'],
        ['cs', 'q'],
        ['q', 'g2', 'deliver'],
        ['q', 'push', 'if offline'],
        ['g1', 'pr', 'heartbeat'],
      ]
    ),
    markdown: `## Estimates
500M × 40 = 20B messages/day ≈ **230K msg/s** average. ~100 B per message → **~2 TB/day**. Concurrent connections: maybe 100M+ → ~1,000+ gateway servers at ~100K connections each.

## Connections
Each online device holds a **WebSocket** to a **gateway** server. Gateways are thin: auth, framing, heartbeats. They register \`device → gateway_id\` in a **connection registry** (Redis with TTL refreshed by heartbeat).

## Send flow
1. Client sends \`{clientMsgId, chatId, body}\` over its socket.
2. Gateway forwards to the **chat service**, which dedupes on \`clientMsgId\`, assigns a per-chat increasing \`msgId\` (e.g. Snowflake or per-chat sequence), and **persists** it.
3. Ack "sent" to the sender.
4. For each recipient device: look up registry → publish to that gateway's topic → gateway pushes over socket → recipient acks → "delivered" receipt flows back.
5. If offline: send a **push notification**; the device syncs on reconnect.

## Storage
Wide-column store (Cassandra/HBase-like): partition key \`chat_id\`, clustering key \`msg_id\` → "latest N messages in a chat" is one partition scan. Very write-friendly.
Per user: \`inbox(user_id, chat_id, last_msg_id, unread)\` for the chat list, plus a per-device **sync cursor**.

## Groups
Store the message **once** under \`chat_id\`; fan out lightweight delivery notifications to members' gateways. Large groups use a queue-based fan-out.

## Receipts & presence
- Read receipts update a per-user **read cursor** per chat (not a flag per message).
- Presence: heartbeat updates \`last_seen\`; push presence changes only to contacts with the chat open (subscribe-on-view) to avoid fan-out storms.

## Reliability
At-least-once delivery + client dedup by \`msgId\`. On reconnect, client asks "give me messages after msgId X" for each chat.

## Trade-offs
Ordering is guaranteed **per chat**, not globally — that's all users perceive and it keeps things partitionable.`,
  },
};
