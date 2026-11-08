import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const newsFeed: Problem = {
  id: 'news-feed',
  title: 'Social Media News Feed',
  difficulty: 'Medium',
  tags: ['Fan-out', 'Caching', 'Ranking', 'Hot keys'],
  summary: 'Build a home timeline of posts from people you follow.',
  statement: `Design the home feed of a social network where users follow other users.

**Requirements**
- Users publish posts (text + optional media).
- The home feed shows recent posts from accounts the user follows, newest first (ranking optional).
- Feed loads fast (< 200 ms) and supports infinite scroll.
- 300M daily active users; average user follows 200 accounts; some accounts have 50M+ followers.
- Users open the feed ~10×/day; ~1 post/user/day on average.`,
  clarifyingQuestions: [
    'Chronological or ranked feed?',
    'How fresh must the feed be when a followed user posts?',
    'Do we handle likes/comments in this design, or only the feed?',
    'Any limits on following count?',
    'How far back should the feed go?',
  ],
  hints: [
    'Two approaches: fan-out on write (push into each follower\'s feed) vs fan-out on read (pull at read time).',
    'Fan-out on write breaks for celebrities with 50M followers. What hybrid avoids that?',
    'Store only post IDs in the feed cache; hydrate post content from a post cache.',
    'Use cursor-based pagination, not offsets.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Publish post + read feed, pagination, latency targets' },
      { id: 'r2', text: 'Read QPS ≈ 3B/day ≈ 35K/s; write ≈ 300M/day ≈ 3.5K/s' },
    ] },
    { section: 'API & Data model', items: [
      { id: 'a1', text: 'POST /posts; GET /feed?cursor=&limit=' },
      { id: 'a2', text: 'Posts table, follow graph (follower → followee) stored efficiently' },
      { id: 'a3', text: 'Feed cache per user: list of post IDs (bounded, e.g. 500)' },
    ] },
    { section: 'High-level design', items: [
      { id: 'h1', text: 'Explains fan-out on write vs read with trade-offs', weight: 2 },
      { id: 'h2', text: 'Hybrid: push for normal users, pull for celebrities', weight: 2 },
      { id: 'h3', text: 'Async fan-out workers via queue' },
      { id: 'h4', text: 'Media in object storage + CDN' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Feed hydration: post IDs → post cache → user cache' },
      { id: 'd2', text: 'Cursor pagination' },
      { id: 'd3', text: 'Inactive users skipped during fan-out; feed rebuilt on return' },
      { id: 'd4', text: 'Ranking service (optional) with features and models' },
      { id: 'd5', text: 'Handles deletes/unfollows (filter at read time)' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'mobile', 'Clients', 0, 160],
        ['lb', 'gateway', 'API Gateway', 200, 160],
        ['ps', 'service', 'Post service', 420, 40],
        ['fs', 'service', 'Feed service', 420, 280],
        ['pdb', 'nosql', 'Posts DB', 640, 0],
        ['pc', 'cache', 'Post cache', 640, 100],
        ['q', 'queue', 'Fan-out queue', 640, 190],
        ['fw', 'worker', 'Fan-out workers', 860, 190],
        ['g', 'sql', 'Follow graph', 860, 60],
        ['fc', 'cache', 'Feed cache (post IDs per user)', 640, 320, 190],
        ['media', 'blob', 'Media store + CDN', 200, 20],
      ],
      [
        ['c', 'lb'],
        ['lb', 'ps', 'POST /posts'],
        ['lb', 'fs', 'GET /feed'],
        ['ps', 'pdb'],
        ['ps', 'pc'],
        ['ps', 'q'],
        ['q', 'fw'],
        ['fw', 'g', 'followers'],
        ['fw', 'fc', 'push post ID'],
        ['fs', 'fc'],
        ['fs', 'pc', 'hydrate'],
        ['c', 'media'],
      ]
    ),
    markdown: `## Estimates
- Feed reads: 300M × 10 = 3B/day ≈ **35K QPS** (peak ~100K).
- Posts: 300M/day ≈ **3.5K writes/s**. Fan-out on write: 3.5K × 200 followers ≈ **700K feed inserts/s** — feasible on a Redis cluster.

## API
\`\`\`
POST /v1/posts            { text, mediaIds[] }
GET  /v1/feed?cursor=&limit=20  → { posts[], nextCursor }
\`\`\`

## Data
- \`posts(post_id, author_id, text, media, created_at)\` — NoSQL keyed by post_id (Snowflake IDs are time-sortable).
- \`follows(follower_id, followee_id)\` — indexed both ways.
- **Feed cache:** Redis sorted set per user of the latest ~500 post IDs.

## Fan-out strategies
| | Fan-out on write (push) | Fan-out on read (pull) |
|---|---|---|
| Read | Very fast (precomputed) | Slow: merge N timelines |
| Write | Expensive for big audiences | Cheap |
| Problem | Celebrities (50M writes per post) | Latency for heavy followers |

**Hybrid:** push for normal authors; for **celebrities** (>~100K followers) skip fan-out. At read time the feed service merges the user's precomputed feed with recent posts from the few celebrities they follow.

## Read path
1. Read post IDs from feed cache (+ celebrity posts).
2. **Hydrate** from post cache and user cache (multi-get), filter deleted posts / blocked users.
3. Optionally rank; return with a **cursor** (last post ID/timestamp).

## Optimizations
- Skip fan-out to users inactive for 30+ days; rebuild their feed on next login via pull.
- Media served via CDN; only URLs in post records.

## Trade-offs
Feed is **eventually consistent** — a few seconds of fan-out delay is acceptable. Push costs storage and write amplification in exchange for fast reads.`,
  },
};
