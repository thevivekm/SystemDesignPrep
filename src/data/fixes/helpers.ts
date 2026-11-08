import type { ComponentType, Sel } from '../../types';

export const k = (...kinds: ComponentType[]): Sel => ({ kinds });
export const id = (...ids: string[]): Sel => ({ ids });

export const USERS = k('client', 'mobile');
export const APP = k('service');
export const DB = k('sql', 'nosql');
export const QUEUE = k('queue', 'pubsub');
