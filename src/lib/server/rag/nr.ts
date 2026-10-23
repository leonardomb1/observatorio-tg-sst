import { finalize, type Chunk, type ChunkDraft } from './chunk.ts';

export interface ParsedNr {
	nr: number;
	slug: string;
	title: string;
	chunks: Chunk[];
}

const FOOTER = /^\s*Este texto não substitui o publicado no DOU\s*$/i;
const ALINEA = /^[a-z]\)\s/;
const CODE = /^(\d+(?:\.\d+)*)\.?\s+(.*)$/;
const ANNEX = /^ANEXO\s+([IVXLC]+)\b(?:.*?NR[\s-]*\d+)?\s*-\s*(.+)$/i;
const GLOSSARY = /^GLOSS[ÁA]RIO\s*$/i;

const LOWERCASE_WORDS = new Set([
	'a',
	'as',
	'o',
	'os',
	'e',
	'de',
	'da',
	'das',
	'do',
	'dos',
	'em',
	'na',
	'no',
	'nas',
	'nos',
	'para',
	'por',
	'com'
]);

function titleCase(text: string): string {
	return text
		.toLowerCase()
		.split(/\s+/)
		.map((word, index) =>
			index > 0 && LOWERCASE_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
		)
		.join(' ');
}

/** Repairs PDF extraction artefacts: "considera -se" and words broken across a line end. */
function tidy(text: string): string {
	return text
		.replace(/(\p{L}) -(\p{L})/gu, '$1-$2')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function compareCodes(a: string, b: string): number {
	const left = a.split('.').map(Number);
	const right = b.split('.').map(Number);
	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		const difference = (left[i] ?? -1) - (right[i] ?? -1);
		if (difference !== 0) return difference;
	}
	return 0;
}

function parentOf(code: string): string | null {
	const index = code.lastIndexOf('.');
	return index === -1 ? null : code.slice(0, index);
}

function isHeading(blocks: readonly string[]): boolean {
	const text = blocks[0]?.trim() ?? '';
	const rest = text.replace(/^\d+(?:\.\d+)*\.?\s+/, '');
	return (
		blocks.length === 1 && rest.length < 100 && !/[.:;,)]$/.test(text) && /^\p{Lu}/u.test(rest)
	);
}

function extractTitle(text: string, nr: number): string {
	const match = new RegExp(`^\\s*NR[\\s-]*0?${nr}\\s*[-–]\\s*(.+)$`, 'im').exec(text);
	return match?.[1] ? titleCase(match[1].trim()) : `Norma Regulamentadora nº ${nr}`;
}

/** Reads the NR number from the heading of the official text ("NR 35 - TRABALHO EM ALTURA"). */
export function detectNrNumber(text: string): number | null {
	const match = /^\s*NR[\s-]*0?(\d{1,2})\s*[-–]\s*\S/im.exec(text);
	return match?.[1] ? Number(match[1]) : null;
}

interface Section {
	label: string;
	annex: string | null;
	codePrefix: string;
}

/**
 * Splits the official text of an NR into one chunk per normative item, reading
 * line by line so headings, the glossary and annexes land in the right place.
 */
export function parseNr(nr: number, text: string): ParsedNr {
	const title = extractTitle(text, nr);
	const root = `NR-${nr} – ${title}`;

	const lines = text.split('\n').filter((line) => line.trim() !== '' && !FOOTER.test(line));

	const drafts: ChunkDraft[] = [];
	const headings = new Map<string, string>();
	let section: Section = { label: root, annex: null, codePrefix: `${nr}.` };
	let glossary = false;
	let current: {
		code: string | null;
		local: string | null;
		blocks: string[];
		trail: string;
	} | null = null;
	let lastCode: string | null = null;

	const flush = () => {
		if (current?.local && isHeading(current.blocks)) {
			const text = tidy(current.blocks[0] ?? '').replace(/^(\d+(?:\.\d+)*)\.?\s+/, '$1 ');
			headings.set(current.local, text);
			current = null;
			return;
		}
		if (current && current.blocks.length > 0) {
			drafts.push({
				trail: current.trail,
				itemCode: current.code,
				parentCode: current.code && !section.annex ? parentOf(current.code) : null,
				pageStart: null,
				pageEnd: null,
				blocks: current.blocks.map(tidy)
			});
		}
		current = null;
	};

	const trailFor = (code: string) => {
		const parts = [section.label];
		const segments = code.split('.');
		for (let depth = 1; depth < segments.length; depth++) {
			const heading = headings.get(segments.slice(0, depth).join('.'));
			if (heading) parts.push(heading);
		}
		return parts.join(' > ');
	};

	for (const raw of lines) {
		const line = raw.trim();

		const annex = ANNEX.exec(line);
		if (annex?.[1] && annex[2]) {
			flush();
			headings.clear();
			glossary = false;
			const label = `Anexo ${annex[1].toUpperCase()} – ${titleCase(annex[2].trim())}`;
			section = { label: `${root} > ${label}`, annex: annex[1].toUpperCase(), codePrefix: '' };
			lastCode = null;
			continue;
		}

		if (GLOSSARY.test(line)) {
			flush();
			glossary = true;
			current = { code: null, local: null, blocks: [], trail: `${root} > Glossário` };
			continue;
		}

		const code = CODE.exec(line);
		const codeValue = code?.[1];
		const startsItem =
			!glossary &&
			codeValue !== undefined &&
			codeValue.startsWith(section.codePrefix) &&
			(lastCode === null || compareCodes(codeValue, lastCode) > 0);

		if (startsItem) {
			flush();
			lastCode = codeValue;
			const itemCode = section.annex ? `Anexo ${section.annex} ${codeValue}` : codeValue;
			current = { code: itemCode, local: codeValue, blocks: [line], trail: trailFor(codeValue) };
			continue;
		}

		if (!current) continue;
		const blocks = current.blocks;
		const startsTerm = glossary && /^[\p{Lu}][^:]{1,60}:\s/u.test(line);
		if (startsTerm && blocks.length > 0) {
			const trail: string = current.trail;
			flush();
			current = { code: null, local: null, blocks: [line], trail };
			continue;
		}
		if (ALINEA.test(line) || startsTerm || blocks.length === 0) {
			blocks.push(line);
		} else {
			const last = blocks.length - 1;
			blocks[last] = `${blocks[last] ?? ''} ${line}`;
		}
	}
	flush();

	return { nr, slug: `nr-${nr}`, title, chunks: finalize(drafts) };
}
