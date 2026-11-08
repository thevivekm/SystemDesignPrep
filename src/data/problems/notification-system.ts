import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const notificationSystem: Problem = {
  id: 'notification-system',
  title: 'Notification System',
  difficulty: 'Medium',
  tags: ['Queues', 'Fan-out', 'Third-party APIs', 'Reliability'],
  summary: 'Send push, SMS, and email notifications reliably at scale.',
  statement: `Design a notification service that other internal teams use to send messages to users over **mobile push, SMS, and email**.

**Requirements**
- Transactional (e.g. "your order shipped") and bulk/marketing notifications.
- Respect user preferences and opt-outs per channel.
- Templates with personalization.
- Delivery status tracking; retries on failure.
- 10M notifications/day normally, spikes of 1M in a few minutes for campaigns.
- Transactional notifications should arrive within seconds.`,
  clarifyingQuestions: [
    'Which channels? Any in-app notifications?',
    'Is exactly-once delivery required, or is at-least-once with dedup okay?',
    'Should transactional messages be prioritised over marketing?',
    'Do we need scheduling (send at user\'s local 9 AM)?',
    'Rate limits per user (e.g. max 3 marketing pushes per day)?',
  ],
  hints: [
    'You don\'t deliver push/SMS/email yourself — you call third-party providers (APNs, FCM, SMS gateways, email providers).',
    'Put a queue per channel between the API and the senders so a slow provider doesn\'t block others.',
    'Separate high-priority (transactional) from low-priority (bulk) traffic.',
    'Retries + at-least-once means duplicates are possible. How do you dedupe?',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Channels, preferences/opt-out, templates, tracking' },
      { id: 'r2', text: 'Priority levels; latency target for transactional' },
    ] },
    { section: 'API & Data', items: [
      { id: 'a1', text: 'POST /notifications {userIds|segment, templateId, params, channels, priority, idempotencyKey}' },
      { id: 'a2', text: 'Stores: user devices/contacts, preferences, templates, notification log' },
    ] },
    { section: 'High-level design', items: [
      { id: 'h1', text: 'Notification service validates, checks preferences, renders template', weight: 1 },
      { id: 'h2', text: 'Per-channel queues and workers', weight: 2 },
      { id: 'h3', text: 'Workers call third-party providers (APNs/FCM, SMS, email)' },
      { id: 'h4', text: 'Separate priority queues for transactional vs bulk', weight: 2 },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Retries with backoff, dead-letter queue, provider failover' },
      { id: 'd2', text: 'Idempotency / dedup to avoid duplicate sends' },
      { id: 'd3', text: 'Bulk fan-out: segment expansion in batches' },
      { id: 'd4', text: 'Per-user rate limits and quiet hours' },
      { id: 'd5', text: 'Delivery status via provider callbacks/webhooks; analytics' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['svc', 'service', 'Internal services', 0, 160],
        ['ns', 'service', 'Notification Service', 220, 160],
        ['pref', 'sql', 'Users / prefs / templates', 220, 20, 170],
        ['cache', 'cache', 'Prefs cache', 0, 20],
        ['qp', 'queue', 'Push queue (hi/lo)', 460, 40],
        ['qs', 'queue', 'SMS queue (hi/lo)', 460, 160],
        ['qe', 'queue', 'Email queue (hi/lo)', 460, 280],
        ['wp', 'worker', 'Push workers', 680, 40],
        ['ws', 'worker', 'SMS workers', 680, 160],
        ['we', 'worker', 'Email workers', 680, 280],
        ['apns', 'external', 'APNs / FCM', 900, 40],
        ['sms', 'external', 'SMS provider', 900, 160],
        ['em', 'external', 'Email provider', 900, 280],
        ['log', 'nosql', 'Notification log + status', 220, 320, 170],
      ],
      [
        ['svc', 'ns', 'send'],
        ['ns', 'pref'],
        ['ns', 'cache'],
        ['ns', 'qp'],
        ['ns', 'qs'],
        ['ns', 'qe'],
        ['qp', 'wp'],
        ['qs', 'ws'],
        ['qe', 'we'],
        ['wp', 'apns'],
        ['ws', 'sms'],
        ['we', 'em'],
        ['ns', 'log'],
      ]
    ),
    markdown: `## Flow
1. Caller sends \`POST /v1/notifications\` with an **idempotency key**.
2. **Notification service** authenticates the caller, validates, expands targets (for segments, a batch job pages through users), loads **preferences** (cached) and drops opted-out channels, renders the **template**, writes a row to the **notification log** (status = queued).
3. Message goes to the **per-channel queue**, split into **high** (transactional) and **low** (bulk) priority. Workers always drain high first.
4. **Channel workers** call the provider (APNs/FCM, SMS gateway, email provider) and update status.
5. Providers' **delivery callbacks/webhooks** update final status (delivered, bounced, opened).

## Why queues per channel
Isolation: an email provider outage or slowdown doesn't delay push. Each worker pool scales independently on its queue depth.

## Reliability
- At-least-once delivery from the queue → **dedupe** with \`(idempotency_key, user, channel)\` in a fast store before sending.
- Retries with exponential backoff; after N failures → **dead-letter queue** for inspection.
- Multiple providers per channel with failover.
- Invalid device tokens (provider says unregistered) are removed.

## Bulk campaigns
1M notifications in minutes: a campaign job expands the segment in batches of ~1K users, enqueues to **low priority**, and is throttled to respect provider rate limits and per-user frequency caps.

## Other details
- **Quiet hours / local time:** scheduler holds messages in a delayed queue.
- **Per-user rate limits:** counter per user/day in Redis.
- **Data:** \`devices(user_id, platform, token)\`, \`preferences(user_id, channel, category, enabled)\`, \`templates(id, channel, body, version)\`, \`notification_log(id, user_id, channel, status, timestamps)\` (wide-column/NoSQL for volume).

## Trade-offs
Exactly-once is impossible across third-party providers; at-least-once + dedup is the practical choice.`,
  },
};
