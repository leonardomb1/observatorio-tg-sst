import {
	ANTHROPIC_API_KEY,
	ASSISTANT_CONNECTION_PER_MINUTE,
	ASSISTANT_DAILY_BUDGET_USD,
	ASSISTANT_DAILY_QUESTIONS,
	TURNSTILE_SECRET_KEY,
	TURNSTILE_SITE_KEY
} from '$app/env/private';
import { TERMS_VERSION } from '#lib/contact.ts';
import { db } from '../db/index.ts';
import { voyage } from '../rag/context.ts';
import { query } from '../starrocks.ts';
import { anthropicModel } from './agent.ts';
import type { ToolDeps } from './tools.ts';

export const assistantModel = ANTHROPIC_API_KEY ? anthropicModel(ANTHROPIC_API_KEY) : null;
export const turnstile =
	TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY
		? { siteKey: TURNSTILE_SITE_KEY, secretKey: TURNSTILE_SECRET_KEY }
		: null;
export const perMinute = ASSISTANT_CONNECTION_PER_MINUTE;
/** An event room shares one address, so its burst ceiling is per code and wider. */
export const eventPerMinute = ASSISTANT_CONNECTION_PER_MINUTE * 5;
export const allowanceSettings = {
	termsVersion: TERMS_VERSION,
	dailyQuestions: ASSISTANT_DAILY_QUESTIONS,
	budgetUsd: ASSISTANT_DAILY_BUDGET_USD
};
export const assistantDeps: ToolDeps = { query, db, voyage };
