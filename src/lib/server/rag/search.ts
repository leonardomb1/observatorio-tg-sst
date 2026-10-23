import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { embed, EMBEDDING_TAG, rerank, type VoyageConfig } from './voyage.ts';

const CANDIDATES = 50;
const FUSED = 30;
const RRF_K = 60;

export interface SearchOptions {
	k?: number;
	collections?: string[];
	useRerank?: boolean;
	/** Admin test search also looks at documents not marked as citable. */
	includeNonCitable?: boolean;
}

interface Hit {
	chunkId: number;
	documentId: string;
	slug: string;
	title: string;
	kind: string;
	trail: string;
	itemCode: string | null;
	pageStart: number | null;
	pageEnd: number | null;
	blocks: string[];
	content: string;
	ranks: { vector: number | null; lexical: number | null; code: number | null };
	rrf: number;
	rerankScore: number | null;
}

export interface SearchResult {
	hits: Hit[];
	usedVector: boolean;
	usedRerank: boolean;
	latencyMs: number;
}

interface Row extends Record<string, unknown> {
	chunk_id: string;
	document_id: string;
	slug: string;
	title: string;
	kind: string;
	trail: string;
	item_code: string | null;
	page_start: number | null;
	page_end: number | null;
	blocks: string[];
	content: string;
}

const NR_CODE = /\b(\d{1,2}(?:\.\d{1,3}){1,6})\b/g;

/** Item codes such as "35.2.1" mentioned in the question, looked up exactly. */
function extractItemCodes(query: string): string[] {
	return [...new Set([...query.matchAll(NR_CODE)].map((match) => match[1] ?? ''))].filter(
		(code) => code.split('.').length >= 2 && !/^\d+\.\d{3}$/.test(code)
	);
}

function visibility(options: SearchOptions) {
	const collections = options.collections?.length
		? sql`and d.collection in ${options.collections}`
		: sql``;
	const citable = options.includeNonCitable ? sql`` : sql`and d.citable`;
	return sql`d.current_version_id = c.version_id and d.status = 'ready' ${citable} ${collections}`;
}

const COLUMNS = sql`c.id as chunk_id, d.id as document_id, d.slug, d.title, d.kind::text as kind,
	c.trail, c.item_code, c.page_start, c.page_end, c.blocks, c.content`;

async function vectorCandidates(db: Db, vector: number[], options: SearchOptions): Promise<Row[]> {
	return db.transaction(async (tx) => {
		await tx.execute(sql`set local hnsw.ef_search = 100`);
		await tx.execute(sql`set local hnsw.iterative_scan = relaxed_order`);
		return tx.execute<Row>(sql`
			select ${COLUMNS}
			from chunk_embeddings e
			join chunks c on c.id = e.chunk_id
			join documents d on d.id = c.document_id
			where e.model = ${EMBEDDING_TAG} and ${visibility(options)}
			order by e.embedding <=> ${JSON.stringify(vector)}::vector
			limit ${CANDIDATES}`);
	});
}

/** Any-term match so natural questions still find candidates; all-terms matches rank first. */
function anyTerm(query: string): string {
	const words = query.match(/[\p{L}\p{N}.]+/gu) ?? [];
	return words.join(' or ');
}

async function lexicalCandidates(db: Db, query: string, options: SearchOptions): Promise<Row[]> {
	const terms = anyTerm(query);
	if (!terms) return [];
	return db.execute<Row>(sql`
		select ${COLUMNS}
		from chunks c
		join documents d on d.id = c.document_id
		where c.tsv @@ websearch_to_tsquery('public.pt_unaccent', ${terms}) and ${visibility(options)}
		order by c.tsv @@ plainto_tsquery('public.pt_unaccent', ${query}) desc,
			ts_rank_cd(c.tsv, websearch_to_tsquery('public.pt_unaccent', ${terms}), 32) desc
		limit ${CANDIDATES}`);
}

async function codeCandidates(db: Db, codes: string[], options: SearchOptions): Promise<Row[]> {
	if (codes.length === 0) return [];
	const prefixes = sql.join(
		codes.map((code) => sql`c.item_code like ${`${code}.%`}`),
		sql` or `
	);
	return db.execute<Row>(sql`
		select ${COLUMNS}
		from chunks c
		join documents d on d.id = c.document_id
		where (c.item_code in ${codes} or ${prefixes}) and ${visibility(options)}
		order by c.item_code, c.seq
		limit ${CANDIDATES}`);
}

/** Reciprocal rank fusion of the vector, full-text and exact-code lists. */
export async function search(
	db: Db,
	voyage: VoyageConfig | null,
	query: string,
	options: SearchOptions = {}
): Promise<SearchResult> {
	const started = performance.now();
	const k = options.k ?? 8;
	const codes = extractItemCodes(query);

	const vector = voyage ? (await embed(voyage, [query], 'query')).vectors[0] : undefined;
	const [vectorRows, lexicalRows, codeRows] = await Promise.all([
		vector ? vectorCandidates(db, vector, options) : Promise.resolve([]),
		lexicalCandidates(db, query, options),
		codeCandidates(db, codes, options)
	]);

	const fused = new Map<number, Hit>();
	const lists = [
		['vector', vectorRows],
		['lexical', lexicalRows],
		['code', codeRows]
	] as const;
	for (const [name, rows] of lists) {
		rows.forEach((row, index) => {
			const chunkId = Number(row.chunk_id);
			const hit = fused.get(chunkId) ?? {
				chunkId,
				documentId: row.document_id,
				slug: row.slug,
				title: row.title,
				kind: row.kind,
				trail: row.trail,
				itemCode: row.item_code,
				pageStart: row.page_start,
				pageEnd: row.page_end,
				blocks: row.blocks,
				content: row.content,
				ranks: { vector: null, lexical: null, code: null },
				rrf: 0,
				rerankScore: null
			};
			hit.ranks[name] = index + 1;
			hit.rrf += 1 / (RRF_K + index + 1);
			fused.set(chunkId, hit);
		});
	}

	let hits = [...fused.values()].sort((a, b) => b.rrf - a.rrf).slice(0, FUSED);
	let usedRerank = false;
	if (voyage && options.useRerank !== false && hits.length > 1) {
		try {
			const ranked = await rerank(
				voyage,
				query,
				hits.map((hit) => hit.content),
				Math.min(k, hits.length)
			);
			hits = ranked.flatMap(({ index, score }) => {
				const hit = hits[index];
				return hit ? [{ ...hit, rerankScore: score }] : [];
			});
			usedRerank = true;
		} catch (error) {
			console.error(JSON.stringify({ level: 'error', source: 'rerank', error: String(error) }));
		}
	}

	return {
		hits: hits.slice(0, k),
		usedVector: vector !== undefined,
		usedRerank,
		latencyMs: Math.round(performance.now() - started)
	};
}
