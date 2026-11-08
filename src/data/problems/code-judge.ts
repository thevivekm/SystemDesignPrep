import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const codeJudge: Problem = {
  id: 'code-judge',
  title: 'Online Coding Judge',
  difficulty: 'Medium',
  tags: ['Sandboxing', 'Queues', 'Security', 'Leaderboard'],
  summary: 'Run untrusted user code safely against test cases and rank contest results.',
  statement: `Design a platform where users solve coding problems and submit code that is judged automatically.

**Requirements**
- Browse problems; submit code in several languages; get a verdict (Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error).
- Code runs against hidden test cases with time and memory limits.
- **Untrusted code must not harm the system or see other users' data.**
- Weekly contests: 50K participants, live leaderboard, submissions spike in the last minutes.
- Normal load: 10K submissions/minute peak.`,
  clarifyingQuestions: [
    'Which languages must be supported?',
    'How fast should verdicts return (seconds)?',
    'Do we need plagiarism detection?',
    'How is contest scoring done (time penalties)?',
  ],
  hints: [
    'Never run user code on your API servers. Where should it run?',
    'Submissions are bursty — a queue between the API and the judges smooths spikes.',
    'Sandboxing: containers/microVMs with no network, CPU/memory limits, read-only FS, seccomp.',
    'The contest leaderboard looks a lot like the gaming leaderboard problem.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Submit, verdicts, limits, contests, security of untrusted code' },
    ] },
    { section: 'Design', items: [
      { id: 'd1', text: 'API stores submission, enqueues judge job, returns submission ID', weight: 1 },
      { id: 'd2', text: 'Judge workers run code in isolated sandboxes', weight: 3 },
      { id: 'd3', text: 'Sandbox limits: no network, CPU/time/memory limits, read-only FS, syscall filtering' },
      { id: 'd4', text: 'Test cases fetched from secure storage; cached on workers' },
      { id: 'd5', text: 'Client gets result by polling or push (WebSocket/SSE)' },
    ] },
    { section: 'Contests', items: [
      { id: 'c1', text: 'Separate priority queue / reserved capacity for contests', weight: 2 },
      { id: 'c2', text: 'Leaderboard with Redis sorted set (score, penalty)' },
      { id: 'c3', text: 'Autoscale judge pool on queue depth; pre-warm before contests' },
    ] },
    { section: 'Deep dives', items: [
      { id: 'x1', text: 'Fair timing: dedicated CPU, consistent hardware, rerun near-limit cases' },
      { id: 'x2', text: 'Rate limits per user; plagiarism detection offline' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['u', 'client', 'Users', 0, 140],
        ['lb', 'lb', 'Load Balancer', 200, 140],
        ['api', 'service', 'Submission API', 400, 140],
        ['db', 'sql', 'Problems / submissions', 400, 0, 170],
        ['q', 'queue', 'Judge queue (contest + normal)', 640, 140, 200],
        ['j', 'worker', 'Judge workers (sandboxed)', 920, 140, 190],
        ['tc', 'blob', 'Test case storage', 940, 0],
        ['ps', 'pubsub', 'Verdict events', 640, 300],
        ['lbd', 'cache', 'Contest leaderboard (Redis)', 920, 300, 190],
      ],
      [['u', 'lb'], ['lb', 'api'], ['api', 'db'], ['api', 'q', 'enqueue'], ['q', 'j'], ['j', 'tc'], ['j', 'ps', 'verdict'], ['ps', 'api', 'save + push'], ['j', 'lbd', 'score']]
    ),
    markdown: `## Flow
1. User submits code → API validates, stores \`submission(status=queued)\`, enqueues a judge job, returns a submission ID.
2. **Judge workers** pull jobs, fetch test cases (cached locally), compile and run the code **inside a sandbox** for each test, compare outputs.
3. The verdict is published as an event; the API saves it and pushes it to the user (SSE/WebSocket), or the client polls.

## Sandboxing (the critical part)
- Run each submission in a fresh **container or microVM** (gVisor/Firecracker) with:
  - **no network**, read-only filesystem except a tmp dir
  - **cgroups** for CPU time and memory limits; wall-clock timeout
  - **seccomp** syscall filtering, non-root user, PID limits (fork bombs)
- Judge workers live in an isolated network segment with no access to production data stores except what they need.

## Contests
- Separate **high-priority queue** and pre-scaled worker pool (pre-warm before start; autoscale on queue depth).
- Leaderboard: Redis sorted set with a composite score (problems solved desc, penalty time asc).
- Rate-limit submissions per user per problem.

## Fairness
Pin each run to dedicated cores, use identical instance types, and re-run tests that finish near the time limit to avoid noisy-neighbour flukes.`,
  },
};
