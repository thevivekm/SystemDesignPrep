import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const ticketBooking: Problem = {
  id: 'ticket-booking',
  title: 'Event Ticket Booking',
  difficulty: 'Medium',
  tags: ['Concurrency', 'Transactions', 'Virtual queue', 'Payments'],
  summary: 'Sell seats for popular events without double-booking under huge spikes.',
  statement: `Design a ticketing platform for concerts and sports events.

**Requirements**
- Browse/search events; view a seat map with availability.
- Select seats and hold them for up to 10 minutes while the user pays.
- **No seat may ever be sold twice.**
- Handle on-sale spikes: 1M+ users arrive at once for a popular event with 50K seats.
- Normal traffic: 10M DAU browsing.`,
  clarifyingQuestions: [
    'Reserved seating, general admission, or both?',
    'How long can a seat be held during checkout?',
    'Do we integrate with an external payment provider?',
    'Should we be fair (first-come-first-served) during a big on-sale?',
    'Max tickets per user?',
  ],
  hints: [
    'Separate the read-heavy browse path from the strongly-consistent booking path.',
    'Holding a seat: a TTL lock (e.g. Redis SET NX EX) or a status column with an expiry and conditional update.',
    'For huge spikes, a virtual waiting room lets a controlled number of users into checkout at a time.',
    'Payment can fail or time out — design the state machine and make payment idempotent.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Strong consistency for booking; availability for browse' },
      { id: 'r2', text: 'Hold timeout, per-user limits, fairness during spikes' },
    ] },
    { section: 'Data & API', items: [
      { id: 'a1', text: 'events, venues, seats(event_id, seat_id, status, hold_expires_at, booking_id), bookings' },
      { id: 'a2', text: 'POST /holds, POST /bookings (with idempotency key), GET /events/{id}/seats' },
    ] },
    { section: 'Concurrency', items: [
      { id: 'c1', text: 'Prevents double booking with conditional update / row lock / unique constraint', weight: 3 },
      { id: 'c2', text: 'Seat hold with TTL and automatic release', weight: 2 },
      { id: 'c3', text: 'Booking state machine: held → paid → confirmed / released' },
    ] },
    { section: 'Scale', items: [
      { id: 's1', text: 'Virtual waiting room / queue for on-sale spikes', weight: 2 },
      { id: 's2', text: 'Cached seat map (slightly stale is OK) separate from booking source of truth' },
      { id: 's3', text: 'Search via search index; event pages via CDN' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Payment idempotency and handling provider timeouts/webhooks' },
      { id: 'd2', text: 'Bot protection and per-user limits' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'client', 'Users', 0, 160],
        ['cdn', 'cdn', 'CDN (event pages)', 0, 20],
        ['wr', 'gateway', 'Waiting room / admission', 200, 160, 170],
        ['es', 'service', 'Event & search service', 440, 20, 170],
        ['si', 'search', 'Search index', 680, 20],
        ['bs', 'service', 'Booking service', 440, 160],
        ['sm', 'cache', 'Seat map cache', 440, 300],
        ['db', 'sql', 'Bookings DB (ACID)', 680, 160],
        ['pay', 'external', 'Payment provider', 900, 160],
        ['rel', 'worker', 'Hold expiry worker', 680, 300],
      ],
      [
        ['c', 'cdn'],
        ['c', 'wr'],
        ['wr', 'es', 'browse'],
        ['es', 'si'],
        ['wr', 'bs', 'admitted token'],
        ['bs', 'db', 'conditional UPDATE'],
        ['bs', 'sm'],
        ['bs', 'pay', 'charge (idempotent)'],
        ['rel', 'db', 'release expired holds'],
      ]
    ),
    markdown: `## Split the system
- **Browse/search** (read-heavy, can be slightly stale): CDN, search index, cached seat maps.
- **Booking** (must be correct): a relational DB with transactions is the source of truth.

## Preventing double booking
Seat row: \`seats(event_id, seat_id, status, hold_user, hold_expires_at, booking_id)\`.
\`\`\`sql
UPDATE seats
SET status='HELD', hold_user=:u, hold_expires_at=now()+interval '10 min'
WHERE event_id=:e AND seat_id IN (:ids)
  AND (status='AVAILABLE' OR (status='HELD' AND hold_expires_at < now()));
-- succeed only if rows_updated == len(ids), otherwise roll back
\`\`\`
The conditional update is atomic — two users can't both hold the same seat. (A Redis \`SET seat:{id} user NX EX 600\` lock is an alternative fast path, but the DB stays authoritative.)

## Booking state machine
\`AVAILABLE → HELD → (payment ok) BOOKED\`, or \`HELD → (timeout/cancel/payment failed) AVAILABLE\`.
- Payment uses an **idempotency key** (the hold ID) so retries don't double-charge.
- Payment webhooks confirm; if a payment succeeds after the hold expired, refund automatically.
- A worker releases expired holds (and lazy expiry in the WHERE clause covers the gap).

## Spikes: virtual waiting room
For a hot on-sale, users land in a **queue**; the admission service lets in N users/min based on remaining seats and booking-service capacity, handing them a signed **admission token**. This protects the DB, gives fairness, and blocks bots (combine with CAPTCHA/rate limits).

## Seat map
Served from a cache updated on every hold/release (pub/sub) — may lag by a second; the booking call is the real check and returns "seat taken" if needed.

## Scaling the DB
Shard by \`event_id\` — all seats of an event on one shard keeps transactions local. A single hot event fits on one well-provisioned primary (50K seats is small); the waiting room keeps write rate bounded.`,
  },
};
