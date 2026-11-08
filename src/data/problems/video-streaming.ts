import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const videoStreaming: Problem = {
  id: 'video-streaming',
  title: 'Video Streaming Platform',
  difficulty: 'Hard',
  tags: ['Transcoding', 'CDN', 'Adaptive bitrate', 'Object storage'],
  summary: 'Upload, transcode, and stream video to hundreds of millions of viewers.',
  statement: `Design a user-generated video platform.

**Requirements**
- Creators upload videos (up to 4 hours / 50 GB).
- Viewers stream videos smoothly on any device and network quality.
- Video page shows title, description, view count, likes, comments.
- Search and recommendations exist but can be treated as black boxes.
- 1B daily views; 500 hours of video uploaded every minute.`,
  clarifyingQuestions: [
    'Which devices and resolutions must we support?',
    'Live streaming in scope, or only on-demand?',
    'How quickly must a video be available after upload?',
    'Global audience? Any regions with poor connectivity?',
    'Do we need DRM?',
  ],
  hints: [
    'Upload and processing is a pipeline: upload → split into segments → transcode in parallel → package.',
    'Adaptive bitrate streaming (HLS/DASH) splits video into small segments in multiple qualities; the player switches quality as bandwidth changes.',
    'Streaming bandwidth is the dominant cost: almost all bytes must come from CDN edges, ideally inside ISPs.',
    'View counts at this scale need approximate/async counting.',
  ],
  rubric: [
    { section: 'Requirements & estimates', items: [
      { id: 'r1', text: 'Upload, processing, playback, metadata; availability & smooth playback' },
      { id: 'r2', text: 'Upload volume (~720K hours/day) and egress bandwidth order of magnitude' },
    ] },
    { section: 'Upload & processing', items: [
      { id: 'u1', text: 'Resumable/chunked upload directly to object storage', weight: 1 },
      { id: 'u2', text: 'Transcoding pipeline as DAG: split → parallel transcode → merge/package', weight: 2 },
      { id: 'u3', text: 'Multiple resolutions/bitrates + codecs; thumbnails' },
      { id: 'u4', text: 'Queue-driven workers; status tracking; retries' },
    ] },
    { section: 'Playback', items: [
      { id: 'p1', text: 'Adaptive bitrate streaming (HLS/DASH) with manifest + segments', weight: 2 },
      { id: 'p2', text: 'CDN serves segments; origin is object storage', weight: 2 },
      { id: 'p3', text: 'Popular content pushed to edge; long tail served from regional/origin' },
    ] },
    { section: 'Metadata & scale', items: [
      { id: 'm1', text: 'Video metadata DB (sharded) + cache' },
      { id: 'm2', text: 'View counts via event stream + batched aggregation' },
      { id: 'm3', text: 'Cost controls: encode popular videos in more formats; cold storage for unpopular' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['cr', 'client', 'Creator', 0, 40],
        ['up', 'service', 'Upload service', 200, 40],
        ['raw', 'blob', 'Raw video storage', 420, 40],
        ['q', 'queue', 'Transcode job queue', 640, 40],
        ['tw', 'worker', 'Transcoder workers (split/encode/package)', 860, 40, 200],
        ['enc', 'blob', 'Encoded segments + manifests', 860, 180, 200],
        ['cdn', 'cdn', 'CDN edges', 640, 300],
        ['v', 'mobile', 'Viewer player (ABR)', 0, 300, 170],
        ['api', 'service', 'Video API (metadata)', 200, 180],
        ['mdb', 'nosql', 'Metadata DB + cache', 420, 180],
        ['ev', 'pubsub', 'View events', 200, 420],
        ['cnt', 'worker', 'Count aggregator', 420, 420],
      ],
      [
        ['cr', 'up', 'resumable upload'],
        ['up', 'raw'],
        ['raw', 'q'],
        ['q', 'tw'],
        ['tw', 'enc'],
        ['tw', 'mdb', 'status=ready'],
        ['v', 'api', 'video page'],
        ['api', 'mdb'],
        ['v', 'cdn', 'manifest + segments'],
        ['cdn', 'enc', 'origin pull'],
        ['v', 'ev', 'view'],
        ['ev', 'cnt'],
        ['cnt', 'mdb'],
      ]
    ),
    markdown: `## Estimates
- Upload: 500 h/min ≈ **720K hours/day**. At ~1 GB/hour raw-ish that's ~700 TB/day of input; encoded renditions add more.
- Views: 1B/day; avg 5 min at ~2 Mbps ≈ 75 MB per view → **~75 PB/day egress** (~7 Tbps average). CDN is non-negotiable.

## Upload
Client gets a resumable upload session and uploads chunks **directly to object storage**. Metadata row created with \`status=processing\`.

## Processing pipeline (DAG)
1. **Split** the source into GOP-aligned segments (e.g. 10 s).
2. **Transcode in parallel** across many workers into a bitrate ladder (240p → 4K) and codecs (H.264 for compatibility, VP9/AV1 for efficiency).
3. Generate thumbnails, run content checks, extract captions.
4. **Package** into HLS/DASH: per-rendition 2–6 s segments + manifests.
5. Write to encoded storage; mark video \`ready\`.
Driven by a job queue; each step is idempotent and retried. Parallel segment encoding turns a 4-hour encode into minutes.

## Playback: adaptive bitrate
Player fetches the **manifest**, measures throughput, and requests segments at the best sustainable bitrate, switching up/down per segment. Segments are plain static files → perfect for **CDN** caching.

## CDN strategy
- Popular videos: pre-warmed/pushed to edges (some platforms put caches inside ISPs).
- Long tail: served from regional caches / origin on demand.
- Cost lever: only encode expensive codecs (AV1) for videos that get popular.

## Metadata & engagement
- Metadata (title, owner, renditions, status) in a sharded DB with cache; page requests are read-heavy.
- **View counts:** player emits events → stream → aggregator batches increments per video (approximate in real time, exact eventually). Fraud filtering happens in the aggregator.

## Trade-offs
More renditions = better experience but more storage/compute; adapt the ladder to popularity.`,
  },
};
