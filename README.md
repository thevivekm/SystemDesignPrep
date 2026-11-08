# DesignPrep — free system design practice

A LeetCode-style practice app for system design interviews. Runs entirely in your browser — no account, no backend, no paywall.

- **25 classic problems** (Easy → Hard) with statement, clarifying questions, and progressive hints
- **Fix the Design**: 13 broken architectures with real symptoms — edit the diagram (add components, rewire, delete links) and it re-checks itself live, recovering the moment your fix is right (no submit button)
- **Quizzes**: 9 topic quizzes (47 questions) incl. diagram-based *Spot the Flaw*, with explanations and best scores
- **Diagram canvas**: drag in load balancers, caches, DBs, queues, CDNs… connect and label them
- **Structured notes**: requirements, estimates, API, data model, high-level design, deep dives, trade-offs
- **Rubric self-grading** with a weighted score, then **reveal a reference solution** with its own diagram
- **Interview timer** (30/45/60 min), status tracking, time spent per problem
- **Concepts primer**: framework, estimation cheat-sheet, caching, sharding, CAP, queues, real-time, reliability
- **Live traffic simulation**: every diagram animates requests flowing along its connections; broken challenges show failing components, dropped requests and degraded metrics, which ease toward healthy as checks pass and turn green when fully fixed (toggle with *Traffic on/paused*; respects reduced-motion)
- Progress saved in `localStorage`; **export/import JSON** in Settings; light/dark mode

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

Build a static site (deployable to GitHub Pages, Netlify, etc. — uses hash routing and relative paths):

```bash
npm run build      # outputs dist/
npm run preview
```

## Adding a problem

1. Copy `src/data/problems/url-shortener.ts` to a new file and edit it.
2. Import it and add it to the `PROBLEMS` array in `src/data/problems/index.ts`.

A problem has: `id` (URL slug), `title`, `difficulty`, `tags`, `summary`, `statement` (Markdown), `clarifyingQuestions`, `hints`, a `rubric` (sections → items with unique `id`s and optional `weight`), and a `reference` with Markdown plus a diagram.

Reference diagrams use the compact `diagram()` helper in `src/data/diagram.ts`:

```ts
diagram(
  [ // [id, kind, label, x, y, width?]
    ['lb', 'lb', 'Load Balancer', 0, 0],
    ['api', 'service', 'API', 220, 0],
  ],
  [ // [from, to, label?]
    ['lb', 'api', 'HTTP'],
  ]
)
```

Component kinds are listed in `src/data/components.ts`.

Don't change a rubric item's `id` after you've used it — saved ticks are keyed by it.

## Adding a Fix-the-Design challenge

Add an object to `src/data/fixes/part1.ts` or `part2.ts`. `start` is the flawed diagram, `solution` the reference fix, and `checks` are declarative rules evaluated on the user's diagram (connections are undirected; nodes are matched by component kind or by id):

| Check | Passes when |
|---|---|
| `exists` | at least `min` nodes match `sel` |
| `link` / `noLink` | some `a` node is / no `a` node is connected to a `b` node |
| `fanout` | one `from` node connects to ≥ `min` distinct `to` nodes |
| `via` | an `a` node and a `b` node both connect to the same `via` node |
| `reach` | an `a` node can reach a `b` node through any path |
| `through` | `a` reaches `b`, but every path goes through a `via` node |

Also give each challenge `hotspots` (start-diagram node id → short status like `'CPU 100%'`, shown on the failing node) and `metrics` (`{ label, broken, healthy }` values shown in the live status banner).

Make sure the starting design fails at least one check and the solution passes all of them.

## Adding quiz questions

Edit `src/data/quizzes/core.ts` (or add a topic to `src/data/quizzes/index.ts`). A question may include a `diagram` to make it a "spot the flaw" question.

## Stack

Vite · React 18 · TypeScript · React Flow (`@xyflow/react`) · Tailwind CSS v4 · Zustand · react-markdown
