const API = 'https://api.voyageai.com/v1';
const MAX_BATCH_INPUTS = 128;
/** Voyage counts tokens; ~3.5 chars per token for Portuguese keeps us well under the 320k cap. */
const MAX_BATCH_CHARS = 600_000;
const MAX_ATTEMPTS = 5;

const EMBEDDING_MODEL = 'voyage-4';
const EMBEDDING_DIMENSIONS = 1024;
export const EMBEDDING_TAG = `${EMBEDDING_MODEL}@${EMBEDDING_DIMENSIONS}`;

export interface VoyageConfig {
	apiKey: string;
	rerankModel: string;
}

class VoyageError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

async function post<T>(config: VoyageConfig, path: string, body: unknown): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		const response = await fetch(`${API}${path}`, {
			method: 'POST',
			headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(60_000)
		});
		if (response.ok) return (await response.json()) as T;

		const retryable = response.status === 429 || response.status >= 500;
		if (!retryable || attempt >= MAX_ATTEMPTS) {
			throw new VoyageError(
				`Voyage ${path} ${response.status}: ${await response.text()}`,
				response.status
			);
		}
		const retryAfter = Number(response.headers.get('retry-after'));
		const waitMs =
			Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}
}

interface EmbeddingResponse {
	data: { index: number; embedding: number[] }[];
	usage: { total_tokens: number };
}

function batches(texts: readonly string[]): string[][] {
	const result: string[][] = [];
	let current: string[] = [];
	let size = 0;
	for (const text of texts) {
		if (
			current.length >= MAX_BATCH_INPUTS ||
			(current.length > 0 && size + text.length > MAX_BATCH_CHARS)
		) {
			result.push(current);
			current = [];
			size = 0;
		}
		current.push(text);
		size += text.length;
	}
	if (current.length > 0) result.push(current);
	return result;
}

export async function embed(
	config: VoyageConfig,
	texts: readonly string[],
	inputType: 'document' | 'query'
): Promise<{ vectors: number[][]; tokens: number }> {
	const vectors: number[][] = [];
	let tokens = 0;
	for (const batch of batches(texts)) {
		const response = await post<EmbeddingResponse>(config, '/embeddings', {
			input: batch,
			model: EMBEDDING_MODEL,
			input_type: inputType,
			output_dimension: EMBEDDING_DIMENSIONS,
			output_dtype: 'float',
			truncation: inputType === 'query'
		});
		const ordered = response.data.toSorted((a, b) => a.index - b.index);
		vectors.push(...ordered.map((item) => item.embedding));
		tokens += response.usage.total_tokens;
	}
	return { vectors, tokens };
}

interface RerankResponse {
	data: { index: number; relevance_score: number }[];
}

export async function rerank(
	config: VoyageConfig,
	query: string,
	documents: readonly string[],
	topK: number
): Promise<{ index: number; score: number }[]> {
	const response = await post<RerankResponse>(config, '/rerank', {
		query,
		documents,
		model: config.rerankModel,
		top_k: topK,
		truncation: true
	});
	return response.data.map((item) => ({ index: item.index, score: item.relevance_score }));
}
