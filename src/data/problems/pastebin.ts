import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const pastebin: Problem = {
  id: 'pastebin',
  title: 'Pastebin',
  difficulty: 'Easy',
  tags: ['Object storage', 'CDN', 'Read-heavy'],
  summary: 'Share text snippets via unique links with expiry and visibility controls.',
  statement: `Design a service where users paste a block of text (code, logs, notes) and get a unique URL to share it.

**Core features**
- Create a paste (up to 10 MB) with optional title, syntax language, expiry, and visibility (public / unlisted / private).
- Anyone with the link can view an unlisted paste; private pastes need login.
- Pastes expire automatically.

**Scale to assume**
- 5M new pastes/day, 10:1 read-to-write.
- Average paste 10 KB; keep data for 1 year unless expired earlier.`,
  clarifyingQuestions: [
    'What is the maximum paste size? Average size?',
    'Do pastes need to be editable after creation?',
    'Is there a public "recent pastes" listing or search?',
    'Do we need syntax highlighting server-side or can the client do it?',
    'Any requirement to delete on first read ("burn after reading")?',
  ],
  hints: [
    'Separate metadata (small, queried) from content (large blobs). Where should each live?',
    'Paste content is immutable once created — that makes it trivially cacheable.',
    'You can reuse the short-code generation idea from a URL shortener.',
    'Think about how expired pastes get removed both from metadata and blob storage.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Covers create/view, expiry, visibility levels, size limit' },
      { id: 'r2', text: 'States non-functionals: durability, low read latency, high availability' },
    ] },
    { section: 'Estimates', items: [
      { id: 'e1', text: '~60 writes/s, ~600 reads/s average' },
      { id: 'e2', text: 'Storage ≈ 5M × 10 KB × 365 ≈ 18 TB/year' },
    ] },
    { section: 'API & Data model', items: [
      { id: 'a1', text: 'POST /pastes, GET /pastes/{id}, DELETE /pastes/{id}' },
      { id: 'a2', text: 'Metadata table (id, owner, title, lang, visibility, size, created_at, expires_at, blob_key)' },
      { id: 'a3', text: 'Content stored in object storage, not in the metadata DB', weight: 2 },
    ] },
    { section: 'High-level design', items: [
      { id: 'h1', text: 'Stateless API servers behind LB' },
      { id: 'h2', text: 'Unique ID generation without collisions' },
      { id: 'h3', text: 'CDN / cache for popular paste content (immutable → long TTL)', weight: 2 },
      { id: 'h4', text: 'Upload path: client can upload directly to object store via pre-signed URL (large pastes)' },
    ] },
    { section: 'Deep dives & trade-offs', items: [
      { id: 'd1', text: 'Expiry cleanup job (metadata + blob lifecycle rules)' },
      { id: 'd2', text: 'Access control for private pastes (not served from public CDN)' },
      { id: 'd3', text: 'Rate limiting and abuse/spam detection' },
      { id: 'd4', text: 'Compression of content to save storage' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'client', 'Client', 0, 140],
        ['cdn', 'cdn', 'CDN (public pastes)', 220, 20],
        ['lb', 'lb', 'Load Balancer', 220, 140],
        ['api', 'service', 'Paste Service', 440, 140],
        ['cache', 'cache', 'Metadata cache', 440, 20],
        ['db', 'sql', 'Metadata DB', 660, 140],
        ['s3', 'blob', 'Object storage (content)', 660, 20, 170],
        ['gc', 'worker', 'Expiry cleaner', 660, 260],
      ],
      [
        ['c', 'cdn', 'GET content'],
        ['c', 'lb', 'API'],
        ['lb', 'api'],
        ['api', 'cache'],
        ['api', 'db'],
        ['api', 's3', 'put/get blob'],
        ['cdn', 's3', 'origin'],
        ['gc', 'db', 'delete expired'],
      ]
    ),
    markdown: `## Key idea
Split **metadata** (tiny, indexed, in a DB) from **content** (large, immutable, in object storage such as S3). This keeps the DB small and lets a CDN serve content cheaply.

## Estimates
- 5M/day ≈ **60 writes/s**, 600 reads/s.
- 5M × 10 KB = 50 GB/day ≈ **18 TB/year** of content (compressed maybe 1/3 of that). Metadata ≈ 5M × 300 B ≈ 1.5 GB/day.

## API
\`\`\`
POST   /v1/pastes  { content, title?, language?, expiresIn?, visibility } → { id, url }
GET    /v1/pastes/{id}          → metadata + content (or a CDN URL)
DELETE /v1/pastes/{id}
\`\`\`

## Flow
1. **Create:** service generates an ID (counter + base62 like a URL shortener), compresses content, writes blob \`pastes/{id}\` to object storage, then writes metadata row.
   For large pastes, return a **pre-signed upload URL** so content bypasses app servers.
2. **Read:** look up metadata (cache → DB), check visibility/expiry, then return content. Public/unlisted content is immutable → serve through **CDN** with long TTL. Private content is fetched via the service with auth, or via short-lived signed URLs.

## Expiry
- Read path checks \`expires_at\` and returns 404/410.
- A background job scans an index on \`expires_at\` and deletes rows; object storage **lifecycle rules** or the job delete blobs. Purge CDN for expired public pastes (or cap CDN TTL to the remaining lifetime).

## Trade-offs
- SQL for metadata is fine at 60 writes/s; shard by ID later if needed.
- Storing content in the DB is simpler for tiny pastes but bloats backups and replicas — object storage scales cheaper.`,
  },
};
