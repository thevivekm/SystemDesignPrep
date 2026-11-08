import type { FixChallenge } from '../../types';
import { fixesPart1 } from './part1';
import { fixesPart2 } from './part2';

export const FIX_CHALLENGES: FixChallenge[] = [...fixesPart1, ...fixesPart2];
export const FIX_BY_ID: Record<string, FixChallenge> = Object.fromEntries(FIX_CHALLENGES.map((f) => [f.id, f]));
