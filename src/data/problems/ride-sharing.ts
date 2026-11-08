import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const rideSharing: Problem = {
  id: 'ride-sharing',
  title: 'Ride Sharing Service',
  difficulty: 'Hard',
  tags: ['Geospatial', 'Matching', 'Real-time', 'State machines'],
  summary: 'Match riders with nearby drivers in real time and track trips.',
  statement: `Design a ride-hailing service.

**Requirements**
- Riders request a ride from A to B and see a price estimate and ETA.
- The system matches the rider with a nearby available driver; the driver can accept or decline.
- Both see each other's live location during the trip.
- Trip lifecycle: requested → matched → picked up → completed → paid.
- 10M rides/day; 1M drivers online at peak sending location every 4 seconds.`,
  clarifyingQuestions: [
    'Single ride type or multiple (pool, premium)?',
    'How is pricing computed? Surge pricing?',
    'Matching objective: nearest driver, or fastest ETA?',
    'Global or single city? Multi-region?',
    'Payment handled by us or an external provider?',
  ],
  hints: [
    '1M drivers × 1 update / 4 s = 250K location writes/s. These are ephemeral — they don\'t need a durable DB write each time.',
    'Index driver locations with a geospatial scheme: geohash, quadtree, or H3 hexagons.',
    'To find nearby drivers, query the rider\'s cell plus neighboring cells.',
    'A driver must not be offered two rides at once — lock/reserve the driver during an offer.',
    'Partition by city/region: rides almost never cross regions.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Request, match, track, trip states, pricing/ETA' },
      { id: 'r2', text: '~250K location updates/s; ~120 ride requests/s avg (peaks higher)' },
    ] },
    { section: 'Location', items: [
      { id: 'l1', text: 'Driver location ingestion via persistent connections; in-memory store', weight: 2 },
      { id: 'l2', text: 'Geospatial index (geohash / quadtree / H3) for nearby search', weight: 2 },
      { id: 'l3', text: 'Location history persisted asynchronously (stream) for analytics/billing' },
    ] },
    { section: 'Matching & trips', items: [
      { id: 'm1', text: 'Matching service ranks candidates by ETA; offers to one driver at a time with timeout', weight: 2 },
      { id: 'm2', text: 'Driver reservation/lock prevents double dispatch', weight: 2 },
      { id: 'm3', text: 'Trip service with explicit state machine; trips in ACID DB' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Partition by city/region (geo-sharding)' },
      { id: 'd2', text: 'Real-time location push to rider via WebSocket' },
      { id: 'd3', text: 'Surge pricing from supply/demand per cell' },
      { id: 'd4', text: 'Payment idempotency; failure handling when driver app disconnects' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['r', 'mobile', 'Rider app', 0, 40],
        ['d', 'mobile', 'Driver app', 0, 300],
        ['gw', 'gateway', 'WS / API Gateway', 220, 170],
        ['loc', 'service', 'Location service', 440, 300],
        ['geo', 'cache', 'Geo index (H3 cells, in-memory)', 680, 300, 200],
        ['ms', 'service', 'Matching service', 680, 170],
        ['ts', 'service', 'Trip service', 440, 40],
        ['tdb', 'sql', 'Trips DB', 680, 40],
        ['lk', 'cache', 'Driver lock / status', 920, 170],
        ['st', 'pubsub', 'Location stream', 440, 430],
        ['an', 'warehouse', 'History / analytics', 680, 430],
        ['pr', 'service', 'Pricing / ETA', 220, 40],
      ],
      [
        ['r', 'gw'],
        ['d', 'gw', 'location every 4s'],
        ['gw', 'loc'],
        ['loc', 'geo'],
        ['loc', 'st'],
        ['st', 'an'],
        ['gw', 'ts', 'request ride'],
        ['ts', 'pr'],
        ['ts', 'ms', 'find driver'],
        ['ms', 'geo', 'nearby cells'],
        ['ms', 'lk', 'reserve'],
        ['ts', 'tdb'],
      ]
    ),
    markdown: `## Estimates
- Location updates: 1M drivers / 4 s = **250K writes/s** — ephemeral, keep in memory.
- Rides: 10M/day ≈ **120/s** avg, ~1K/s peak. Each needs a few nearby-driver queries.

## Location service
- Drivers keep a WebSocket to the gateway and send \`(driverId, lat, lng, heading, status)\`.
- Location service updates an **in-memory geo index** (e.g. Redis GEO or custom service) keyed by **H3 cell / geohash**: \`cell → {driverIds}\`, \`driver → (lat,lng,cell,ts)\`.
- Also publishes to a **stream** for trip tracking, ETA models, and history — persisted asynchronously.

## Matching
1. Rider requests → trip service creates trip \`REQUESTED\`, gets price/ETA estimate.
2. Matching service queries rider's cell + rings of neighbors for **available** drivers, ranks by **road-network ETA** (not straight-line distance).
3. **Reserve** the best driver atomically (\`SET driver:{id}:lock trip NX EX 15\`) so no other trip offers to them.
4. Send offer; if declined/timeout → release and try next candidate.
5. On accept → trip \`MATCHED\`; both apps subscribe to each other's location channel.

## Trip state machine
\`REQUESTED → MATCHED → DRIVER_ARRIVING → IN_PROGRESS → COMPLETED → PAID\` (+ \`CANCELLED\`). Stored in a relational DB with conditional transitions; each transition emits an event.

## Scaling
- **Geo-shard by city/region**: location index, matching, and trips for a city live in the same regional cluster.
- Hot cities get more shards by subdividing cells.
- Surge pricing: per-cell supply (available drivers) vs demand (requests) computed every few seconds from the stream.

## Failure handling
- Driver app disconnects → status goes stale after N seconds and they're excluded from matching.
- Payments via provider with idempotency key = trip ID.

## Trade-offs
In-memory location data can be lost on node failure — fine, drivers resend every 4 s. Trips and payments, by contrast, need durable ACID storage.`,
  },
};
