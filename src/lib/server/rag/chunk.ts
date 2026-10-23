import { createHash } from 'node:crypto';

export interface Chunk {
	seq: number;
	trail: string;
	itemCode: string | null;
	parentCode: string | null;
	pageStart: number | null;
	pageEnd: number | null;
	blocks: string[];
	content: string;
	contentHash: string;
}

export type ChunkDraft = Omit<Chunk, 'seq' | 'content' | 'contentHash'> & {
	/** Page of each block, when known; used to give split pieces their own page range. */
	blockPages?: (number | null)[];
};

export const MAX_CHUNK_CHARS = 2000;

/** Packs blocks into pieces under the size cap without splitting a block. */
function packBlocks(blocks: readonly string[], maxChars = MAX_CHUNK_CHARS): string[][] {
	const pieces: string[][] = [];
	let current: string[] = [];
	let size = 0;
	for (const block of blocks) {
		if (current.length > 0 && size + block.length > maxChars) {
			pieces.push(current);
			current = [];
			size = 0;
		}
		current.push(block);
		size += block.length + 1;
	}
	if (current.length > 0) pieces.push(current);
	return pieces;
}

export function finalize(drafts: readonly ChunkDraft[]): Chunk[] {
	const chunks: Chunk[] = [];
	for (const { blockPages, ...draft } of drafts) {
		let offset = 0;
		for (const blocks of packBlocks(draft.blocks)) {
			const pages = (blockPages?.slice(offset, offset + blocks.length) ?? []).filter(
				(page) => page !== null
			);
			offset += blocks.length;
			const content = [draft.trail, ...blocks].filter(Boolean).join('\n');
			chunks.push({
				...draft,
				pageStart: pages.length ? Math.min(...pages) : draft.pageStart,
				pageEnd: pages.length ? Math.max(...pages) : draft.pageEnd,
				blocks,
				seq: chunks.length,
				content,
				contentHash: createHash('sha256').update(content).digest('hex')
			});
		}
	}
	return chunks;
}
