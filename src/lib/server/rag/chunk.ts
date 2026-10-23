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

/**
 * Cuts a block larger than the cap at line breaks, then at sentence ends, then at the
 * last space before the cap. Annex tables arrive as one huge block and would otherwise
 * exceed the embedding model's input limit.
 */
export function splitOversized(block: string, maxChars = MAX_CHUNK_CHARS): string[] {
	if (block.length <= maxChars) return [block];
	for (const separator of [/\n+/, /(?<=[.;:])\s+/]) {
		const parts = block.split(separator).filter((part) => part.trim());
		if (parts.length > 1) return parts.flatMap((part) => splitOversized(part, maxChars));
	}
	const cut = block.lastIndexOf(' ', maxChars);
	const at = cut > maxChars / 2 ? cut : maxChars;
	return [block.slice(0, at), ...splitOversized(block.slice(at).trimStart(), maxChars)];
}

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
	for (const { blockPages: rawPages, ...raw } of drafts) {
		const split = raw.blocks.map((block) => splitOversized(block));
		const draft = { ...raw, blocks: split.flat() };
		const blockPages = rawPages
			? split.flatMap((parts, index) => parts.map(() => rawPages[index] ?? null))
			: undefined;
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
