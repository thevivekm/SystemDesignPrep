import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const proximityService: Problem = {
  id: 'proximity-service',
  title: 'Nearby Places Search',
  difficulty: 'Medium',
  tags: ['Geospatial', 'Geohash', 'Read-heavy', 'Caching'],
  summary: 'Find restaurants and shops near a user\'s location.',
  statement: `Design a service that returns businesses near a location (e.g. "restaurants within 2 km").

**Requirements**
- Search by latitude/longitude and radius (500 m to 20 km), optional category filter.
- Business owners add/update listings; changes can show up by the next day.
- View business details and photos.
- 100M DAU, 5 searches per user per day; 200M businesses worldwide.`,
  clarifyingQuestions: [
    'Should results be ranked by distance, rating, or both?',
    'How fresh must business updates be?',
    'Max radius? What if there are few results — expand automatically?',
    'Is real-time moving data (like drivers) involved? (No — businesses are static.)',
  ],
  hints: [
    'A 2D range query over lat/lng is inefficient with normal indexes. How do you turn 2D into 1D?',
    'Geohash: nearby points share prefixes. Search the user\'s cell plus its 8 neighbours.',
    'Quadtrees adapt cell size to density (Manhattan vs desert).',
    'Data barely changes and reads dominate — replicate and cache heavily.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Search API, business CRUD, freshness tolerance' },
      { id: 'r2', text: '500M searches/day ≈ 6K QPS avg (peak ~15K); 200M businesses fits in memory as index' },
    ] },
    { section: 'API & Data', items: [
      { id: 'a1', text: 'GET /search?lat&lng&radius&category; business CRUD endpoints' },
      { id: 'a2', text: 'Business table + geospatial index table (geohash → business_id)' },
    ] },
    { section: 'Geospatial index', items: [
      { id: 'g1', text: 'Geohash / quadtree / S2/H3 explained with trade-offs', weight: 3 },
      { id: 'g2', text: 'Query neighbouring cells to handle boundary issues', weight: 2 },
      { id: 'g3', text: 'Choose precision from radius; expand if too few results' },
    ] },
    { section: 'Scaling', items: [
      { id: 's1', text: 'Separate location-search service from business service' },
      { id: 's2', text: 'Read replicas / in-memory index replicated per region' },
      { id: 's3', text: 'Cache hot cells and business details; nightly index rebuild' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'mobile', 'Users', 0, 120],
        ['lb', 'lb', 'Load Balancer', 200, 120],
        ['ls', 'service', 'Location search service', 420, 40, 180],
        ['bs', 'service', 'Business service', 420, 220],
        ['geo', 'cache', 'Geo index (geohash → ids)', 680, 40, 190],
        ['bc', 'cache', 'Business cache', 680, 160],
        ['db', 'sql', 'Business DB (primary + replicas)', 680, 280, 200],
        ['job', 'worker', 'Nightly index builder', 960, 160],
      ],
      [['c', 'lb'], ['lb', 'ls', 'search'], ['lb', 'bs', 'details / CRUD'], ['ls', 'geo'], ['ls', 'bc', 'hydrate'], ['bs', 'db'], ['bs', 'bc'], ['db', 'job'], ['job', 'geo']]
    ),
    markdown: `## Estimates
500M searches/day ≈ **6K QPS** (peak ~15K). 200M businesses × (id + geohash ≈ 30 B) ≈ 6 GB → the index fits in memory and can be replicated widely.

## Geospatial indexing
- **Geohash:** encodes lat/lng into a base32 string; shared prefix ⇒ nearby. Precision 6 ≈ 1.2 km × 0.6 km cells. Query the user's cell **and its 8 neighbours** (points near a boundary may be in the next cell).
- **Quadtree:** recursively split the map until each leaf has ≤ N businesses; adapts to density. Built in memory at startup.
- **Google S2 / Uber H3:** hierarchical cells with better geometry; great in production.

Chosen: **geohash** in a table \`geo_index(geohash, business_id)\` (or in-memory map) — simple, works with plain DB indexes and caches.

## Search flow
1. Pick geohash precision from the radius.
2. Fetch business IDs for the 9 cells (cached per cell).
3. Hydrate details from the business cache, filter by exact distance + category, rank by distance/rating.
4. Too few results → step down one precision level (bigger cells).

## Writes
Owners update via the business service (primary DB). Index rebuild/refresh runs **nightly** (requirement allows next-day freshness), so the hot read path never contends with writes.

## Scaling
Stateless search service; replicate the index per region; DB read replicas; CDN for photos.`,
  },
};
