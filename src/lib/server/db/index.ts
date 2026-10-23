import { DATABASE_URL } from '$app/env/private';
import { createDb } from './client.ts';

export const db = createDb(DATABASE_URL);
