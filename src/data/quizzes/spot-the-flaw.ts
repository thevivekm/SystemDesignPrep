import type { QuizTopic } from '../../types';
import { diagram } from '../diagram';

export const spotTheFlaw: QuizTopic = {
  id: 'spot-the-flaw',
  title: 'Spot the Flaw',
  description: 'Read an architecture diagram and identify its biggest problem.',
  questions: [
    {
      id: 'f1',
      hotspots: { db: 'CPU 100% · SPOF' },
      question: 'This URL shortener handles 20K redirects/s. What is the biggest problem?',
      diagram: diagram(
        [
          ['u', 'client', 'Users', 0, 80],
          ['lb', 'lb', 'Load Balancer', 200, 80],
          ['a', 'service', 'Redirect service ×6', 400, 80],
          ['db', 'sql', 'Single SQL DB', 680, 80],
        ],
        [['u', 'lb'], ['lb', 'a'], ['a', 'db', 'every redirect']]
      ),
      options: ['The load balancer should be L4', 'Every redirect hits a single database — no cache, and the DB is a single point of failure', 'There are too many service instances', 'Redirects should use WebSockets'],
      answer: 1,
      explanation: 'Redirects are read-heavy and highly repetitive: add a cache (and replicas). One DB taking all 20K reads/s is both a bottleneck and a SPOF.',
    },
    {
      id: 'f2',
      hotspots: { o: 'p99 9 s', e: 'down' },
      question: 'An order service calls payment, inventory, shipping and email **synchronously in sequence** before responding. What\'s the main flaw?',
      diagram: diagram(
        [
          ['u', 'client', 'Checkout', 0, 120],
          ['o', 'service', 'Order service', 200, 120],
          ['p', 'external', 'Payment', 440, 0],
          ['i', 'service', 'Inventory', 440, 80],
          ['s', 'service', 'Shipping', 440, 160],
          ['e', 'external', 'Email', 440, 240],
        ],
        [['u', 'o'], ['o', 'p', '1'], ['o', 'i', '2'], ['o', 's', '3'], ['o', 'e', '4']]
      ),
      options: ['Latency and availability multiply: any slow/down dependency (even email) fails checkout; non-critical steps should be async', 'There is no CDN', 'Payment should be called last', 'The client should call each service directly'],
      answer: 0,
      explanation: 'Availability of a synchronous chain ≈ product of each part\'s availability. Keep only payment/inventory on the critical path; shipping and email should be event-driven.',
    },
    {
      id: 'f3',
      hotspots: { c: 'stale data' },
      question: 'A cache sits in front of the database. What is wrong with this setup?',
      diagram: diagram(
        [
          ['a', 'service', 'App servers', 0, 80],
          ['c', 'cache', 'Cache (no TTL, never invalidated)', 240, 0, 220],
          ['db', 'sql', 'Database', 240, 160],
        ],
        [['a', 'c', 'read'], ['a', 'db', 'write']]
      ),
      options: ['Caches must be behind the database', 'Writes update the DB but cached values are never invalidated or expired — users see stale data indefinitely', 'Caches can only store strings', 'Nothing — this is cache-aside'],
      answer: 1,
      explanation: 'Without invalidation-on-write or a TTL, the cache serves old values forever. Delete the key on update and set a TTL.',
    },
    {
      id: 'f4',
      hotspots: { q: 'OTP delayed 6 min' },
      question: 'A notification service fans out marketing pushes. What\'s the flaw?',
      diagram: diagram(
        [
          ['m', 'service', 'Campaign service', 0, 80],
          ['q', 'queue', 'One shared queue', 220, 80],
          ['w', 'worker', 'Workers', 440, 80],
          ['t', 'service', 'Order service (OTP / receipts)', 0, 200, 200],
        ],
        [['m', 'q', '5M marketing msgs'], ['t', 'q', 'OTP codes'], ['q', 'w']]
      ),
      options: ['Workers should be stateless', 'Transactional messages (OTP) share one FIFO queue with a 5M-message marketing blast, so OTPs are delayed for minutes', 'Queues cannot hold 5M messages', 'Order service should send pushes directly'],
      answer: 1,
      explanation: 'Separate queues (or priorities) for transactional vs bulk traffic so a campaign can never delay login codes.',
    },
    {
      id: 'f5',
      hotspots: { db: 'double booked' },
      question: 'A seat-booking flow checks availability, then books. Two users click the same seat at once. What breaks?',
      diagram: diagram(
        [
          ['u', 'client', 'Users', 0, 80],
          ['b', 'service', 'Booking service', 200, 80],
          ['db', 'sql', 'Seats DB', 440, 80],
        ],
        [['u', 'b'], ['b', 'db', '1) SELECT status  2) UPDATE booked']]
      ),
      options: ['Nothing, SQL is ACID', 'Check-then-act race: both SELECTs see "available" and both UPDATEs succeed → double booking', 'The service needs a CDN', 'SELECT queries are too slow'],
      answer: 1,
      explanation: 'Make it atomic: a conditional `UPDATE … WHERE status = \'AVAILABLE\'` and check rows affected, or `SELECT … FOR UPDATE` inside a transaction.',
    },
    {
      id: 'f6',
      hotspots: { w: '80M writes/post', f: 'overloaded' },
      question: 'This feed system writes each new post into every follower\'s feed. Which user breaks it?',
      diagram: diagram(
        [
          ['p', 'service', 'Post service', 0, 80],
          ['q', 'queue', 'Fan-out queue', 200, 80],
          ['w', 'worker', 'Fan-out workers', 400, 80],
          ['f', 'cache', 'Per-user feed cache', 620, 80],
        ],
        [['p', 'q'], ['q', 'w'], ['w', 'f', 'write to each follower']]
      ),
      options: ['A user with no followers', 'A celebrity with 80M followers — one post triggers 80M writes', 'A user who posts text only', 'A user who is offline'],
      answer: 1,
      explanation: 'Pure fan-out-on-write fails for celebrities. Use the hybrid: pull celebrity posts at read time and merge.',
    },
  ],
};
