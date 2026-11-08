import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const photoSharing: Problem = {
  id: 'photo-sharing',
  title: 'Photo Sharing App',
  difficulty: 'Medium',
  tags: ['Object storage', 'CDN', 'Media processing', 'Feed'],
  summary: 'Upload, process, and serve billions of photos with a follow feed.',
  statement: `Design a photo-sharing social app.

**Requirements**
- Users upload photos with captions; photos are shown in multiple sizes.
- Users follow others and see a feed of their photos.
- Likes and comments with counts.
- 500M DAU; 100M photo uploads/day; avg original photo 2 MB.
- Viewing must be fast globally; uploads can take a few seconds to process.`,
  clarifyingQuestions: [
    'Do we need video too, or photos only?',
    'Which sizes/thumbnails are required?',
    'Can photos be edited or deleted?',
    'Private accounts?',
    'How accurate must like counts be in real time?',
  ],
  hints: [
    'Uploads should bypass your app servers. How can a client upload straight to object storage?',
    'Generate resized versions asynchronously after upload.',
    'Almost all read bandwidth should be served by a CDN.',
    'Like counts on viral posts are a hot-key write problem.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Upload, view, feed, likes/comments; latency & availability' },
      { id: 'r2', text: 'Storage: 100M × 2 MB ≈ 200 TB/day (+ resized variants)' },
    ] },
    { section: 'Upload pipeline', items: [
      { id: 'u1', text: 'Pre-signed URL direct upload to object storage', weight: 2 },
      { id: 'u2', text: 'Async processing (resize, strip EXIF, moderation) via queue', weight: 2 },
      { id: 'u3', text: 'Metadata stored with processing status' },
    ] },
    { section: 'Serving', items: [
      { id: 's1', text: 'CDN in front of object storage for images', weight: 2 },
      { id: 's2', text: 'Feed generation (reference news-feed fan-out approach)' },
      { id: 's3', text: 'Metadata DB sharded by user_id / photo_id' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Like counters: sharded counters / async aggregation; eventual consistency' },
      { id: 'd2', text: 'Storage tiering: cold photos to cheaper storage' },
      { id: 'd3', text: 'Content moderation and privacy (signed URLs for private accounts)' },
      { id: 'd4', text: 'Dedup identical uploads via content hash' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'mobile', 'Mobile app', 0, 160],
        ['cdn', 'cdn', 'CDN', 0, 20],
        ['gw', 'gateway', 'API Gateway', 220, 160],
        ['ups', 'service', 'Upload service', 440, 60],
        ['fs', 'service', 'Feed / social service', 440, 260, 170],
        ['s3', 'blob', 'Object storage', 220, 20],
        ['q', 'queue', 'Processing queue', 660, 20],
        ['pw', 'worker', 'Resize / moderation workers', 880, 20, 180],
        ['md', 'nosql', 'Photo metadata', 660, 140],
        ['fc', 'cache', 'Feed + counts cache', 660, 260],
        ['ld', 'nosql', 'Likes / comments', 880, 260],
      ],
      [
        ['c', 'gw'],
        ['gw', 'ups', 'request upload URL'],
        ['c', 's3', 'PUT (pre-signed)'],
        ['s3', 'q', 'upload event'],
        ['q', 'pw'],
        ['pw', 's3', 'variants'],
        ['pw', 'md', 'status=ready'],
        ['ups', 'md'],
        ['gw', 'fs'],
        ['fs', 'fc'],
        ['fs', 'ld'],
        ['c', 'cdn', 'GET images'],
        ['cdn', 's3', 'origin'],
      ]
    ),
    markdown: `## Estimates
- Uploads: 100M/day ≈ **1.2K/s**; originals **200 TB/day** (+ ~30% for variants).
- Views: 500M users × ~50 images = 25B image views/day ≈ **300K/s** — almost all from the **CDN**.

## Upload flow
1. Client asks the upload service for a **pre-signed URL**; a metadata row is created with \`status = pending\`.
2. Client uploads the original **directly to object storage** — app servers never touch the bytes.
3. Storage emits an event → **processing queue** → workers generate sizes (thumb/medium/large, WebP/AVIF), strip EXIF/GPS, run moderation, compute hash for dedup.
4. Metadata updated to \`ready\`; post is fanned out to followers' feeds.

## Read flow
Feed service returns photo metadata with CDN URLs; images load from the **CDN** (origin = object storage). Private accounts get **signed, expiring URLs**.

## Data
- \`photos(photo_id, owner_id, caption, variants, created_at, status)\` — sharded by photo_id.
- Feed: same hybrid push/pull as a news feed.
- \`likes(photo_id, user_id)\` + **counters**: for viral photos, use sharded counters in Redis and periodically persist; counts are eventually consistent.

## Cost
Lifecycle policies move rarely viewed originals to infrequent-access/cold tiers; keep only popular variants hot.

## Trade-offs
Async processing means a photo appears a few seconds after upload — acceptable, and it keeps the upload path resilient.`,
  },
};
