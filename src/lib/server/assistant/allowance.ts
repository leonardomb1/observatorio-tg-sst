import type { Db } from '../db/client.ts';
import { findConsent } from './consent.ts';
import { questionsToday } from './conversations.ts';
import { eventUse, findActiveEvent } from './events.ts';
import { spentTodayUsd } from './limits.ts';

export interface Allowance {
	/** False until the visitor accepted the current terms in the start step. */
	started: boolean;
	event: { code: string; label: string } | null;
	remaining: number;
	/** The daily budget is spent; only event codes keep working. */
	paused: boolean;
	effort: 'low' | 'medium';
}

const LOW_EFFORT_SHARE = 0.8;

/**
 * What a visitor may ask right now. Under a live event code the event's pool and
 * per-person limit apply; otherwise the personal daily quota and the site budget.
 */
export async function allowance(
	db: Db,
	visitor: string | null,
	settings: { termsVersion: string; dailyQuestions: number; budgetUsd: number }
): Promise<Allowance> {
	const closed = {
		started: false,
		event: null,
		remaining: 0,
		paused: false,
		effort: 'medium'
	} as const;
	if (!visitor) return closed;
	const consent = await findConsent(db, visitor, settings.termsVersion);
	if (!consent) return closed;

	const event = consent.eventCode ? await findActiveEvent(db, consent.eventCode) : null;
	if (event) {
		const use = await eventUse(db, event.code, visitor);
		const poolLeft = event.questionPool - use.total;
		if (poolLeft > 0) {
			return {
				started: true,
				event: { code: event.code, label: event.label },
				remaining: Math.max(0, Math.min(poolLeft, event.perVisitor - use.mine)),
				paused: false,
				effort: 'medium'
			};
		}
	}

	const [spent, asked] = await Promise.all([spentTodayUsd(db), questionsToday(db, visitor)]);
	return {
		started: true,
		event: null,
		remaining: Math.max(0, settings.dailyQuestions - asked),
		paused: spent >= settings.budgetUsd,
		effort: spent >= settings.budgetUsd * LOW_EFFORT_SHARE ? 'low' : 'medium'
	};
}
