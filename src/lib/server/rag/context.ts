import { RERANK_MODEL, VOYAGE_API_KEY } from '$app/env/private';
import type { VoyageConfig } from './voyage.ts';

export const voyage: VoyageConfig | null = VOYAGE_API_KEY
	? { apiKey: VOYAGE_API_KEY, rerankModel: RERANK_MODEL }
	: null;
