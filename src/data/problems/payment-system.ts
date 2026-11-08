import type { Problem } from '../../types';
import { diagram } from '../diagram';

export const paymentSystem: Problem = {
  id: 'payment-system',
  title: 'Payment System',
  difficulty: 'Hard',
  tags: ['Idempotency', 'Ledger', 'Consistency', 'Reconciliation'],
  summary: 'Process e-commerce payments correctly, exactly once, with a reliable ledger.',
  statement: `Design the payment backend for an e-commerce marketplace.

**Requirements**
- Customers pay for orders by card through an external payment provider (PSP).
- Sellers get paid out (minus fees) later.
- **Never charge a customer twice; never lose a payment.**
- Keep an auditable record of every money movement.
- 1M transactions/day; peaks of 500/s during sales.`,
  clarifyingQuestions: [
    'Do we store card numbers ourselves? (Ideally no — PSP tokenisation.)',
    'Which currencies? Refunds and chargebacks in scope?',
    'How fast must sellers be paid?',
    'What happens if the PSP times out — do we know if the charge happened?',
  ],
  hints: [
    'Every external call can time out with an unknown outcome. How do you retry safely?',
    'Idempotency keys on both your API and your calls to the PSP.',
    'Use a double-entry ledger: every movement is a debit and a credit that sum to zero.',
    'Your records and the PSP\'s records will drift — reconcile them daily.',
  ],
  rubric: [
    { section: 'Requirements', items: [
      { id: 'r1', text: 'Pay-in, pay-out, no double charge, auditability, PCI scope' },
    ] },
    { section: 'Design', items: [
      { id: 'd1', text: 'Payment service + PSP integration with hosted card page / tokens (no raw cards)', weight: 1 },
      { id: 'd2', text: 'Idempotency keys on client→us and us→PSP calls', weight: 3 },
      { id: 'd3', text: 'Payment state machine (created → pending → succeeded/failed)', weight: 1 },
      { id: 'd4', text: 'Double-entry ledger, append-only', weight: 2 },
      { id: 'd5', text: 'Wallet/balance service for sellers; payouts batch' },
    ] },
    { section: 'Consistency & failures', items: [
      { id: 'c1', text: 'Handling PSP timeouts: query status / webhooks, never blind retry without key', weight: 2 },
      { id: 'c2', text: 'Webhooks verified and processed idempotently' },
      { id: 'c3', text: 'Outbox / saga between order, payment, ledger' },
      { id: 'c4', text: 'Daily reconciliation against PSP settlement files', weight: 2 },
    ] },
    { section: 'Other', items: [
      { id: 'x1', text: 'Strongly consistent relational DB with replicas; strict auditing' },
      { id: 'x2', text: 'Security: encryption, access control, fraud checks' },
    ] },
  ],
  reference: {
    diagram: diagram(
      [
        ['c', 'client', 'Checkout page', 0, 120],
        ['o', 'service', 'Order service', 220, 40],
        ['p', 'service', 'Payment service', 220, 220],
        ['psp', 'external', 'Payment provider (PSP)', 220, 400, 180],
        ['pdb', 'sql', 'Payments DB + idempotency keys', 500, 220, 210],
        ['ob', 'pubsub', 'Events (outbox)', 780, 220],
        ['l', 'service', 'Ledger service', 1000, 120],
        ['ldb', 'sql', 'Double-entry ledger', 1220, 120],
        ['w', 'service', 'Wallet / payouts', 1000, 320],
        ['rec', 'worker', 'Reconciliation job', 500, 400],
      ],
      [['c', 'o'], ['o', 'p', 'pay (idem. key)'], ['p', 'pdb'], ['p', 'psp', 'charge ⇄ webhook'], ['pdb', 'ob'], ['ob', 'l'], ['l', 'ldb'], ['ob', 'w'], ['rec', 'psp', 'settlement file'], ['rec', 'ldb', 'compare']]
    ),
    markdown: `## Pay-in flow
1. Checkout creates an order and calls **payment service** with an **idempotency key** (e.g. order ID). Payment row: \`CREATED\`.
2. Card details go to the **PSP's hosted page/SDK** → we get a token; raw card numbers never touch our servers (smaller PCI scope).
3. Payment service calls PSP \`charge\` **with its own idempotency key** → \`PENDING\`.
4. PSP responds (or sends a **webhook**) → \`SUCCEEDED\`/\`FAILED\`. Webhooks are signature-verified and idempotent.
5. In the same DB transaction, write an **outbox** event → ledger and wallet services update.

## Idempotency
Table \`idempotency(key, request_hash, response, status)\`. A retry with the same key returns the stored result instead of charging again. The PSP call uses the same idea — so a timeout followed by retry cannot double-charge.

**Timeouts:** outcome unknown → keep \`PENDING\`, query the PSP by key, or wait for the webhook. Never retry with a new key.

## Ledger
**Double-entry**, append-only: each movement creates balanced entries (\`customer −$100\`, \`marketplace +$100\`; later \`marketplace −$90 / seller +$90 / fees +$10\`). Balances are derived; history is immutable → auditable.

## Payouts
Wallet service tracks seller balances; a daily payout job batches transfers via the PSP, again idempotently.

## Reconciliation
Every day, compare the ledger with the PSP's **settlement files**. Mismatches (missed webhooks, partial failures) are auto-fixed or flagged for finance.

## Storage
Relational DB with ACID and synchronous replication — correctness over throughput (500/s is modest).`,
  },
};
