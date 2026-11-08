import type { Problem } from '../../types';
import { adClickAggregation } from './ad-click-aggregation';
import { codeJudge } from './code-judge';
import { distributedCache } from './distributed-cache';
import { jobScheduler } from './job-scheduler';
import { leaderboard } from './leaderboard';
import { messageQueue } from './message-queue';
import { metricsMonitoring } from './metrics-monitoring';
import { paymentSystem } from './payment-system';
import { proximityService } from './proximity-service';
import { uniqueId } from './unique-id';
import { chat } from './chat';
import { collabEditor } from './collab-editor';
import { fileSync } from './file-sync';
import { keyValueStore } from './key-value-store';
import { newsFeed } from './news-feed';
import { notificationSystem } from './notification-system';
import { pastebin } from './pastebin';
import { photoSharing } from './photo-sharing';
import { rateLimiter } from './rate-limiter';
import { rideSharing } from './ride-sharing';
import { ticketBooking } from './ticket-booking';
import { typeahead } from './typeahead';
import { urlShortener } from './url-shortener';
import { videoStreaming } from './video-streaming';
import { webCrawler } from './web-crawler';

/** Order here is the order shown in the problem list. Add new problems to this array. */
export const PROBLEMS: Problem[] = [
  urlShortener,
  pastebin,
  rateLimiter,
  uniqueId,
  leaderboard,
  keyValueStore,
  webCrawler,
  notificationSystem,
  typeahead,
  newsFeed,
  chat,
  photoSharing,
  fileSync,
  ticketBooking,
  distributedCache,
  proximityService,
  jobScheduler,
  adClickAggregation,
  metricsMonitoring,
  codeJudge,
  videoStreaming,
  rideSharing,
  collabEditor,
  paymentSystem,
  messageQueue,
];

export const PROBLEM_BY_ID: Record<string, Problem> = Object.fromEntries(PROBLEMS.map((p) => [p.id, p]));
