import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { ingestJobs } from '../db/schema.ts';

export const CHANNEL = 'ingest_jobs';
const MAX_ATTEMPTS = 5;
const STALE_AFTER = '15 minutes';

export type Job = typeof ingestJobs.$inferSelect;
type NewJob = Pick<
	typeof ingestJobs.$inferInsert,
	'kind' | 'documentId' | 'versionId' | 'createdBy'
>;

export async function enqueue(db: Db, job: NewJob): Promise<number> {
	const [row] = await db.insert(ingestJobs).values(job).returning({ id: ingestJobs.id });
	await db.execute(sql`select pg_notify(${CHANNEL}, '')`);
	if (!row) throw new Error('enqueue returned no row');
	return row.id;
}

/** Takes the oldest due job, safe with several workers and behind pgbouncer. */
export async function claim(db: Db, workerId: string): Promise<Job | null> {
	const rows = await db.execute<{ id: string }>(sql`
		update ingest_jobs
		set state = 'running', locked_by = ${workerId}, locked_at = now(), attempts = attempts + 1
		where id = (
			select id from ingest_jobs
			where state = 'queued' and run_after <= now()
			order by id
			for update skip locked
			limit 1
		)
		returning id`);
	const id = rows[0]?.id;
	if (id === undefined) return null;
	const [job] = await db
		.select()
		.from(ingestJobs)
		.where(eq(ingestJobs.id, Number(id)));
	return job ?? null;
}

export async function report(
	db: Db,
	id: number,
	stage: string,
	progress = 0,
	total: number | null = null
): Promise<void> {
	await db.update(ingestJobs).set({ stage, progress, total }).where(eq(ingestJobs.id, id));
}

export async function complete(db: Db, id: number, usageTokens: number): Promise<void> {
	await db
		.update(ingestJobs)
		.set({ state: 'done', stage: 'done', usageTokens, finishedAt: new Date(), error: null })
		.where(eq(ingestJobs.id, id));
}

/** Retries with exponential backoff (2, 4, 8, 16 min) before giving up. */
export async function fail(db: Db, job: Job, error: unknown): Promise<'retry' | 'failed'> {
	const message = error instanceof Error ? error.message : String(error);
	const final = job.attempts >= MAX_ATTEMPTS;
	await db
		.update(ingestJobs)
		.set({
			state: final ? 'failed' : 'queued',
			error: message.slice(0, 4000),
			lockedBy: null,
			lockedAt: null,
			runAfter: sql`now() + make_interval(mins => ${2 ** job.attempts})`,
			finishedAt: final ? new Date() : null
		})
		.where(eq(ingestJobs.id, job.id));
	return final ? 'failed' : 'retry';
}

/** Requeues jobs whose worker died mid-run. */
export async function reap(db: Db): Promise<void> {
	await db.execute(sql`
		update ingest_jobs set state = 'queued', locked_by = null, locked_at = null
		where state = 'running' and locked_at < now() - ${STALE_AFTER}::interval`);
}
