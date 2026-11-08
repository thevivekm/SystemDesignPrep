import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const jobScheduler: Problem = {
  id: 'job-scheduler',
  title: 'Distributed Job Scheduler',
  difficulty: 'Medium',
  tags: ['Queues', 'Leases', 'Cron', 'Reliability'],
  summary: 'Run millions of one-off and recurring jobs on time, exactly when due.',
  statement: `Design a service that lets other teams schedule jobs: "run this task at 3 PM tomorrow" or "every hour".

**Requirements**
- One-off and recurring (cron) jobs.
- Jobs should start within a few seconds of their scheduled time.
- A job should not run twice concurrently; failed jobs are retried.
- View job status and history.
- 10M scheduled jobs; peaks of 50K jobs due in the same minute.`,
  clarifyingQuestions: [
    'Does the scheduler execute jobs itself, or trigger callbacks/queue messages?',
    'Max job duration?',
    'At-least-once or exactly-once execution?',
    'Priorities or per-tenant quotas?',
  ],
  hints: [
    'Separate scheduling (deciding what is due) from execution (running it).',
    'Polling the whole jobs table every second won\'t scale. Index by next_run_time and partition.',
    'Use leases with timeouts so a crashed worker\'s job gets picked up again.',
    'At-least-once execution means jobs should be idempotent.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'One-off + cron, timing accuracy, no concurrent duplicate runs, retries' },
    ] },
    { section: 'Data & API', items: [
      { id: 'a1', text: 'POST /jobs {schedule, payload, target, retryPolicy}; GET /jobs/{id}/runs' },
      { id: 'a2', text: 'jobs(job_id, next_run_at, cron, status, partition) indexed by next_run_at; job_runs history' },
    ] },
    { section: 'Design', items: [
      { id: 'd1', text: 'Scheduler polls due jobs by time bucket / partition and enqueues them', weight: 2 },
      { id: 'd2', text: 'Queue between scheduler and worker pool', weight: 2 },
      { id: 'd3', text: 'Leases/visibility timeouts + heartbeats for running jobs', weight: 2 },
      { id: 'd4', text: 'Compute next_run_at for recurring jobs after enqueue' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'x1', text: 'Partition jobs across scheduler instances; leader election per partition' },
      { id: 'x2', text: 'Idempotency / dedupe key per (job, scheduled_time)' },
      { id: 'x3', text: 'Retries with backoff, DLQ, alerting' },
      { id: 'x4', text: 'Thundering herd at :00 — spread load, worker autoscaling' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'service', 'Client teams', 0, 120],
        ['api', 'service', 'Job API', 200, 120],
        ['db', 'sql', 'Jobs DB (by next_run_at)', 420, 120, 180],
        ['sch', 'worker', 'Schedulers (1 per partition)', 420, 0, 190],
        ['zk', 'coordinator', 'Leader election', 680, 0],
        ['q', 'queue', 'Ready queue', 680, 120],
        ['w', 'worker', 'Executor workers', 900, 120],
        ['t', 'external', 'Target services', 900, 260],
      ],
      [['c', 'api'], ['api', 'db'], ['sch', 'db', 'poll due'], ['sch', 'zk'], ['sch', 'q', 'enqueue'], ['q', 'w', 'lease'], ['w', 't', 'run'], ['w', 'db', 'status']]
    ),
    markdown: `## Split responsibilities
- **Job API**: CRUD, stores definitions.
- **Scheduler**: finds due jobs and enqueues them. Doesn't run anything.
- **Executors**: pull from the queue and run jobs (or call target services).

## Data
\`jobs(job_id, tenant, cron_expr | run_at, next_run_at, payload, retry_policy, partition)\` with an index on \`(partition, next_run_at)\`.
\`job_runs(job_id, scheduled_for, status, attempt, started_at, finished_at)\`.

## Scheduling loop
Jobs are hashed into partitions; each partition is owned by one scheduler (leader election via ZooKeeper/etcd). Every second:
\`SELECT … WHERE partition=:p AND next_run_at <= now() LIMIT 1000 FOR UPDATE SKIP LOCKED\`
→ enqueue \`(job_id, scheduled_for)\` → compute and store the next \`next_run_at\` for recurring jobs — in one transaction (or outbox) so nothing is lost.

## Execution guarantees
- Queue gives each message to one worker with a **visibility timeout/lease**; long jobs **heartbeat** to extend it. If a worker dies, the lease expires and another worker retries.
- That's **at-least-once** → dedupe on \`(job_id, scheduled_for)\` and ask job authors for idempotent tasks.
- Retries with exponential backoff; after N attempts → DLQ + alert.

## Peaks
50K jobs due at 09:00 → schedulers enqueue fast; workers autoscale on queue depth. Optionally add jitter for jobs that allow it.`,
  },
};
