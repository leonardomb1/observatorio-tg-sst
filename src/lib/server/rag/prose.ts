import { finalize, type Chunk, type ChunkDraft } from './chunk.ts';
import type { Page } from './extract.ts';

interface Paragraph {
	text: string;
	page: number | null;
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;

function normalize(text: string): string {
	return text
		.normalize('NFC')
		.replace(/\r\n?/g, '\n')
		.replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
		.replace(/[ \t]+/g, ' ');
}

const pattern = (line: string) => line.trim().replace(/\d+/g, '#');

function edges(page: Page): string[] {
	const lines = page.text.split('\n').filter((line) => line.trim() !== '');
	return [...lines.slice(0, 2), ...lines.slice(-2)];
}

/** Running headers and footers: edge lines that repeat, digits aside, on most pages. */
function boilerplate(pages: readonly Page[]): Set<string> {
	if (pages.length < 4) return new Set();
	const counts = new Map<string, number>();
	for (const page of pages) {
		for (const line of new Set(edges(page).map(pattern))) {
			counts.set(line, (counts.get(line) ?? 0) + 1);
		}
	}
	return new Set([...counts].filter(([, count]) => count > pages.length / 2).map(([line]) => line));
}

function paragraphs(pages: readonly Page[]): Paragraph[] {
	const repeated = boilerplate(pages);
	const result: Paragraph[] = [];
	for (const page of pages) {
		const edgeLines = new Set(edges(page));
		const lines = normalize(page.text)
			.split('\n')
			.filter((line) => !(edgeLines.has(line) && repeated.has(pattern(line))));
		let buffer: string[] = [];
		const push = () => {
			const text = buffer.join(' ').trim();
			if (text) result.push({ text, page: page.number });
			buffer = [];
		};
		for (const line of lines) {
			if (line.trim() === '' || HEADING.test(line.trim())) {
				push();
				if (line.trim()) result.push({ text: line.trim(), page: page.number });
			} else {
				buffer.push(line.trim());
			}
		}
		push();
	}
	return result;
}

/**
 * Splits markdown or extracted PDF text into sections by heading, each carrying
 * the heading trail and page range; paragraphs are the citable blocks.
 */
export function chunkProse(title: string, pages: readonly Page[]): Chunk[] {
	const drafts: ChunkDraft[] = [];
	const stack: { level: number; text: string }[] = [];
	let blocks: Paragraph[] = [];

	const flush = () => {
		if (blocks.length === 0) return;
		drafts.push({
			trail: [title, ...stack.map((heading) => heading.text)].join(' > '),
			itemCode: null,
			parentCode: null,
			pageStart: null,
			pageEnd: null,
			blocks: blocks.map((block) => block.text),
			blockPages: blocks.map((block) => block.page)
		});
		blocks = [];
	};

	for (const paragraph of paragraphs(pages)) {
		const heading = HEADING.exec(paragraph.text);
		if (heading?.[1] && heading[2]) {
			flush();
			const level = heading[1].length;
			while ((stack.at(-1)?.level ?? 0) >= level) stack.pop();
			if (stack.length > 0 || heading[2].trim().toLowerCase() !== title.trim().toLowerCase()) {
				stack.push({ level, text: heading[2] });
			}
		} else {
			blocks.push(paragraph);
		}
	}
	flush();

	return finalize(drafts);
}
