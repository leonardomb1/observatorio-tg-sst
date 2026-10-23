import { hostname } from 'node:os';
import * as z from 'zod';
import { createDb } from '../lib/server/db/client.ts';
import { runMigrations } from '../lib/server/db/migrate.ts';
import { markFailed, runJob, type IngestContext } from '../lib/server/rag/ingest.ts';
import { CHANNEL, claim, fail, reap } from '../lib/server/rag/queue.ts';

const env = z
	.object({
		DATABASE_URL: z.url(),
		VOYAGE_API_KEY: z.string().min(1).optional(),
		RERANK_MODEL: z.string().default('rerank-2.5'),
		MIGRATIONS_DIR: z.string().default('drizzle')
	})
	.parse(process.env);

const TICK_MS = 30_000;
const workerId = `${hostname()}:${process.pid}`;

function log(level: 'info' | 'error', message: string, extra: Record<string, unknown> = {}) {
	const line = JSON.stringify({ level, source: 'worker', message, ...extra });
	if (level === 'error') console.error(line);
	else console.warn(line);
}

await runMigrations(env.DATABASE_URL, env.MIGRATIONS_DIR);

const db = createDb(env.DATABASE_URL, 3);
const ctx: IngestContext = {
	db,
	voyage: env.VOYAGE_API_KEY ? { apiKey: env.VOYAGE_API_KEY, rerankModel: env.RERANK_MODEL } : null
};

const state: { stopping: boolean; draining: Promise<void> | null; wake: () => void } = {
	stopping: false,
	draining: null,
	wake: () => undefined
};

async function drain() {
	for (
		let job = await claim(db, workerId);
		job && !state.stopping;
		job = await claim(db, workerId)
	) {
		const started = Date.now();
		try {
			await runJob(ctx, job);
			log('info', 'job done', { id: job.id, kind: job.kind, ms: Date.now() - started });
		} catch (error) {
			const outcome = await fail(db, job, error);
			if (outcome === 'failed') await markFailed(db, job, error);
			log('error', 'job failed', { id: job.id, kind: job.kind, outcome, error: String(error) });
		}
	}
}

function kick() {
	state.draining ??= drain().finally(() => {
		state.draining = null;
	});
	return state.draining;
}

await db.$client.listen(CHANNEL, () => {
	void kick();
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
	process.on(signal, () => {
		state.stopping = true;
		state.wake();
	});
}

log('info', 'worker started', { workerId, embeddings: ctx.voyage ? 'voyage' : 'disabled' });

while (!state.stopping) {
	await reap(db);
	await kick();
	await new Promise<void>((resolve) => {
		state.wake = resolve;
		setTimeout(resolve, TICK_MS);
	});
}

await state.draining;
await db.$client.end({ timeout: 5 });
log('info', 'worker stopped', { workerId });
