import { db } from '#lib/server/db/index.ts';
import { retrievalLog } from '#lib/server/db/schema.ts';
import { voyage } from '#lib/server/rag/context.ts';
import { search } from '#lib/server/rag/search.ts';
import { EMBEDDING_TAG } from '#lib/server/rag/voyage.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const useRerank = url.searchParams.get('rerank') !== 'nao';
	const includeNonCitable = url.searchParams.get('todos') === 'sim';
	const settings = {
		query,
		useRerank,
		includeNonCitable,
		voyageConfigured: voyage !== null,
		rerankModel: voyage?.rerankModel ?? null
	};
	if (!query) return { ...settings, result: null };

	const result = await search(db, voyage, query, { k: 10, useRerank, includeNonCitable });
	await db.insert(retrievalLog).values({
		query,
		embeddingModel: result.usedVector ? EMBEDDING_TAG : null,
		rerankModel: result.usedRerank ? (voyage?.rerankModel ?? null) : null,
		results: result.hits.map((hit) => ({
			chunkId: hit.chunkId,
			ranks: hit.ranks,
			rrf: hit.rrf,
			rerank: hit.rerankScore
		})),
		latencyMs: result.latencyMs,
		source: 'admin'
	});
	return { ...settings, result };
};
