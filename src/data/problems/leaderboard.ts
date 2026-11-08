import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const leaderboard: Problem = {
  id: 'leaderboard',
  title: 'Real-time Gaming Leaderboard',
  difficulty: 'Easy',
  tags: ['Redis', 'Sorted sets', 'Real-time'],
  summary: 'Rank millions of players by score with instant updates.',
  statement: `Design the leaderboard for a mobile game.

**Requirements**
- When a player wins a match their score increases; the leaderboard updates in real time.
- Show the **top 10** players and a player's **own rank** (with a few players around them).
- Monthly leaderboard that resets each month.
- 25M monthly active users, 5M DAU, ~10 matches per player per day.`,
  clarifyingQuestions: [
    'Global leaderboard only, or also per-region/friends?',
    'How are ties broken?',
    'Must rank be exact for everyone, or only for the top players?',
    'How do we prevent cheating (fake score submissions)?',
  ],
  hints: [
    'An SQL `ORDER BY score` plus counting rows above a player is O(n) per rank query at this scale.',
    'Redis sorted sets give O(log n) update and rank lookups.',
    'Scores must come from the game server, not the client.',
    'Persist scores durably too — Redis is the serving layer.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Top-K, own rank, neighbours, monthly reset, real-time' },
      { id: 'r2', text: '50M score updates/day ≈ 600/s avg, peaks a few thousand/s' },
    ] },
    { section: 'Design', items: [
      { id: 'd1', text: 'Explains why SQL rank queries don\'t scale', weight: 1 },
      { id: 'd2', text: 'Redis sorted set: ZINCRBY, ZREVRANGE, ZREVRANK', weight: 3 },
      { id: 'd3', text: 'One key per month (leaderboard:2026-11) for reset' },
      { id: 'd4', text: 'Scores validated by game servers (anti-cheat), not trusted from client' },
      { id: 'd5', text: 'Durable store (DB) for score history; rebuild Redis from it' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'x1', text: 'Tie-breaking via composite score (score + time)' },
      { id: 'x2', text: 'Scaling beyond one Redis node: shard by score range or approximate ranks' },
      { id: 'x3', text: 'Cache top-10 response; user profile hydration' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'mobile', 'Game clients', 0, 100],
        ['gs', 'service', 'Game servers', 220, 20],
        ['lb', 'service', 'Leaderboard service', 220, 180],
        ['r', 'cache', 'Redis sorted set (per month)', 480, 100, 200],
        ['db', 'nosql', 'Scores / match history', 480, 240, 170],
        ['u', 'cache', 'Profile cache', 760, 100],
      ],
      [['c', 'gs', 'play match'], ['gs', 'lb', 'score +N (trusted)'], ['c', 'lb', 'GET top / my rank'], ['lb', 'r', 'ZINCRBY / ZREVRANK'], ['lb', 'db', 'persist'], ['lb', 'u', 'names, avatars']]
    ),
    markdown: `## Why not SQL
\`SELECT COUNT(*) FROM scores WHERE score > :mine\` scans a large index per request — too slow for 5M DAU checking ranks constantly.

## Redis sorted set
Key \`lb:2026-11\`, member = user ID, score = points.
- Win: \`ZINCRBY lb:2026-11 1 user42\` — O(log n)
- Top 10: \`ZREVRANGE lb:2026-11 0 9 WITHSCORES\`
- My rank: \`ZREVRANK lb:2026-11 user42\` then neighbours with \`ZREVRANGE rank-4 rank+4\`
25M members × ~50 B ≈ 1–2 GB → fits one node (with a replica).

## Flow
1. Game **server** decides the result and calls the leaderboard service (clients can't submit scores → anti-cheat).
2. Service updates Redis and writes the event to a durable DB (for history, audits, and rebuilding Redis).
3. Reads go to Redis; user names/avatars are hydrated from a profile cache.

## Monthly reset
New key each month; old keys expire or are archived. No mass deletes.

## Ties
Encode \`score * 10^10 + (MAX_TS - timestamp)\` so earlier achievers rank higher.

## Bigger scale
Shard by score range, or keep exact ranks only for the top N and show percentiles for others.`,
  },
};
