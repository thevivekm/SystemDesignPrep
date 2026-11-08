import type { QuizTopic } from '../../types';
import { coreQuizzes } from './core';
import { spotTheFlaw } from './spot-the-flaw';

export const QUIZ_TOPICS: QuizTopic[] = [...coreQuizzes, spotTheFlaw];
export const QUIZ_BY_ID: Record<string, QuizTopic> = Object.fromEntries(QUIZ_TOPICS.map((q) => [q.id, q]));
