import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const fileSync: Problem = {
  id: 'file-sync',
  title: 'Cloud File Storage & Sync',
  difficulty: 'Medium',
  tags: ['Chunking', 'Sync', 'Object storage', 'Consistency'],
  summary: 'Store files in the cloud and keep them in sync across devices.',
  statement: `Design a cloud file storage service with desktop and mobile clients that keep a folder in sync across devices.

**Requirements**
- Upload, download, delete, rename files and folders (files up to 50 GB).
- Changes on one device appear on the user's other devices within seconds.
- Share files/folders with other users.
- Version history (restore previous versions for 30 days).
- Efficient on bandwidth: editing a small part of a big file shouldn't re-upload everything.
- 100M users, 10M DAU.`,
  clarifyingQuestions: [
    'Max file size? Typical file size?',
    'Is offline editing supported? How are conflicts handled?',
    'Real-time collaborative editing in scope? (Usually no)',
    'How long is version history kept?',
    'Is end-to-end encryption required?',
  ],
  hints: [
    'Split files into chunks (e.g. 4 MB) identified by their content hash.',
    'Only upload chunks the server doesn\'t already have — that gives delta sync and dedup.',
    'Keep a metadata DB (files, versions, chunk lists) separate from block storage.',
    'Clients need to learn about changes: long polling or a notification channel, then fetch a change list from a cursor.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Upload/download, sync, sharing, versioning, large files' },
      { id: 'r2', text: 'Consistency expectation for metadata (strong) vs blobs' },
    ] },
    { section: 'High-level design', items: [
      { id: 'h1', text: 'Chunking with content-hash IDs', weight: 2 },
      { id: 'h2', text: 'Block storage (object store) separate from metadata DB', weight: 2 },
      { id: 'h3', text: 'Upload only missing chunks; resumable uploads' },
      { id: 'h4', text: 'Notification service (long poll/WebSocket) to tell clients about changes' },
    ] },
    { section: 'Data model', items: [
      { id: 'a1', text: 'files(file_id, path, owner, latest_version), versions(file_id, ver, chunk_list)' },
      { id: 'a2', text: 'Per-user/namespace change journal with cursor for sync' },
      { id: 'a3', text: 'Metadata in SQL (ACID) sharded by user/namespace' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'd1', text: 'Conflict handling: version check on commit; create "conflicted copy"' },
      { id: 'd2', text: 'Dedup across users via chunk hash (reference counting for GC)' },
      { id: 'd3', text: 'Sharing/ACLs model' },
      { id: 'd4', text: 'Garbage-collect orphaned chunks after version retention expires' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'client', 'Desktop client (watcher, chunker)', 0, 160, 200],
        ['lb', 'gateway', 'API Gateway', 260, 160],
        ['ms', 'service', 'Metadata service', 480, 80],
        ['bs', 'service', 'Block service', 480, 240],
        ['mdb', 'sql', 'Metadata DB (sharded)', 720, 80, 170],
        ['s3', 'blob', 'Block storage (chunks)', 720, 240, 170],
        ['ns', 'service', 'Notification service', 260, 20],
        ['j', 'queue', 'Change journal', 480, -40],
      ],
      [
        ['c', 'lb'],
        ['lb', 'ms', 'commit / list changes'],
        ['lb', 'bs', 'upload missing chunks'],
        ['ms', 'mdb'],
        ['bs', 's3'],
        ['ms', 'j', 'append change'],
        ['j', 'ns'],
        ['ns', 'c', 'long poll: changed'],
      ]
    ),
    markdown: `## Core idea: content-addressed chunks
Files are split into ~4 MB chunks; each chunk's ID is its **SHA-256**. A file version is just an ordered **list of chunk hashes**.
- Edit a small part → only changed chunks are new → **delta upload**.
- Same chunk anywhere in the system is stored once → **dedup**.

## Upload flow
1. Client watcher notices a change, chunks the file, computes hashes.
2. Asks metadata service: "which of these hashes are missing?"
3. Uploads only missing chunks to the **block service** (→ object storage), resumable.
4. **Commits** the new version: \`{path, baseVersion, chunkList}\`. The metadata service does an atomic compare-and-set on \`baseVersion\`.
5. Appends an entry to the user's **change journal**.

## Sync to other devices
- Clients hold a **long poll** (or WebSocket) to the notification service: "anything after cursor X?"
- On notification, client calls \`listChanges(cursor)\` → gets changed paths and new chunk lists → downloads missing chunks.

## Data model (SQL, sharded by namespace/user)
- \`files(file_id, namespace_id, path, latest_version, deleted)\`
- \`versions(file_id, version, chunk_list, size, created_at, device)\`
- \`journal(namespace_id, seq, file_id, op)\` — the sync cursor is \`seq\`.
- \`chunks(hash, size, refcount)\`
- \`shares(namespace_id, user_id, role)\`

Metadata needs **strong consistency** (ACID) — the source of truth for what a folder contains. Blobs are immutable, so eventual replication is fine.

## Conflicts
If two devices commit from the same base version, the second CAS fails → client saves its version as **"file (conflicted copy)"** and the user decides.

## Versioning & GC
Old versions retained 30 days; a GC job decrements chunk refcounts for expired versions and deletes unreferenced chunks.

## Trade-offs
Content-defined chunking (rolling hash) handles insertions better than fixed-size chunks but costs more CPU.`,
  },
};
