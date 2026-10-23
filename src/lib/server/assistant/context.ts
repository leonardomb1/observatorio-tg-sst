import { ANTHROPIC_API_KEY, ASSISTANT_DAILY_QUESTIONS } from '$app/env/private';
import { db } from '../db/index.ts';
import { voyage } from '../rag/context.ts';
import { query } from '../starrocks.ts';
import { anthropicModel } from './agent.ts';
import type { ToolDeps } from './tools.ts';

export const assistantModel = ANTHROPIC_API_KEY ? anthropicModel(ANTHROPIC_API_KEY) : null;
export const dailyQuestions = ASSISTANT_DAILY_QUESTIONS;
export const assistantDeps: ToolDeps = { query, db, voyage };
