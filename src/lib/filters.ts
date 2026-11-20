import { UF_NAMES } from './uf.ts';

/**
 * The filters a group page applies to all of its sections. Each one lives in
 * the URL under its own parameter, with a short slug as value, so a filtered
 * view is a link that can be shared; `uf` also follows the reader across the
 * whole site. A section whose source lacks a dimension ignores that filter and
 * says so.
 */
export type Dimension = 'uf' | 'sexo' | 'idade' | 'raca' | 'atividade' | 'ocupacao';

interface Option {
	/** Value in the URL. */
	slug: string;
	label: string;
	/** Value as the datamart stores it. */
	value: string;
}

interface DimensionDef {
	label: string;
	/** Noun for "o filtro de …" notices. */
	noun: string;
	options: readonly Option[];
}

const same = (labels: readonly string[], slug: (label: string) => string) =>
	labels.map((label) => ({ slug: slug(label), label, value: label }));

const plainSlug = (label: string) =>
	label
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** CNAE 2.0 sections, with the short names the charts use. */
const CNAE_SECTIONS: readonly Option[] = [
	['A', 'Agropecuária, produção florestal e pesca'],
	['B', 'Indústrias extrativas'],
	['C', 'Indústrias de transformação'],
	['D', 'Eletricidade e gás'],
	['E', 'Água, esgoto e resíduos'],
	['F', 'Construção'],
	['G', 'Comércio e reparação de veículos'],
	['H', 'Transporte, armazenagem e correio'],
	['I', 'Alojamento e alimentação'],
	['J', 'Informação e comunicação'],
	['K', 'Atividades financeiras e seguros'],
	['L', 'Atividades imobiliárias'],
	['M', 'Atividades profissionais, científicas e técnicas'],
	['N', 'Atividades administrativas e serviços complementares'],
	['O', 'Administração pública, defesa e seguridade social'],
	['P', 'Educação'],
	['Q', 'Saúde humana e serviços sociais'],
	['R', 'Artes, cultura, esporte e recreação'],
	['S', 'Outras atividades de serviços'],
	['T', 'Serviços domésticos'],
	['U', 'Organismos internacionais']
].map(([code = '', label = '']) => ({ slug: code.toLowerCase(), label, value: code }));

/** CBO 2002 major groups; 7 and 8 share a name in the classification and differ by process. */
const CBO_GROUPS: readonly Option[] = [
	['0', 'Forças armadas, policiais e bombeiros militares'],
	['1', 'Dirigentes e gerentes'],
	['2', 'Profissionais das ciências e das artes'],
	['3', 'Técnicos de nível médio'],
	['4', 'Serviços administrativos'],
	['5', 'Serviços e vendedores do comércio'],
	['6', 'Agropecuária, florestal e pesca'],
	['7', 'Produção industrial (operações discretas)'],
	['8', 'Produção industrial (processos contínuos)'],
	['9', 'Reparação e manutenção']
].map(([code = '', label = '']) => ({ slug: code, label, value: code }));

/** Age bands as the cubes store them, youngest first. */
export const AGE_BANDS = [
	'Até 17',
	'18 a 24',
	'25 a 34',
	'35 a 44',
	'45 a 54',
	'55 a 64',
	'65 ou mais'
] as const;

export const DIMENSIONS: Record<Dimension, DimensionDef> = {
	uf: {
		label: 'Estado',
		noun: 'estado',
		options: Object.entries(UF_NAMES)
			.map(([uf, name]) => ({ slug: uf.toLowerCase(), label: name, value: uf }))
			.toSorted((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
	},
	sexo: {
		label: 'Sexo',
		noun: 'sexo',
		options: same(['Feminino', 'Masculino'], plainSlug)
	},
	idade: {
		label: 'Idade',
		noun: 'idade',
		options: AGE_BANDS.map((band) => ({
			slug: plainSlug(band),
			label:
				band === 'Até 17'
					? 'Até 17 anos'
					: band.replace(' ou mais', ' anos ou mais').replace(/(\d)$/, '$1 anos'),
			value: band
		}))
	},
	raca: {
		label: 'Raça/cor',
		noun: 'raça/cor',
		options: same(['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena'], plainSlug)
	},
	atividade: { label: 'Atividade', noun: 'atividade', options: CNAE_SECTIONS },
	ocupacao: { label: 'Ocupação', noun: 'ocupação', options: CBO_GROUPS }
};

export const DIMENSION_KEYS = Object.keys(DIMENSIONS) as Dimension[];

/** Active filters by dimension, as datamart values. */
export type Selection = Partial<Record<Dimension, Option>>;

export interface Filters {
	/** Requested year; each section falls back to its source's last complete year. */
	year: number | null;
	selection: Selection;
}

/** Read access to search parameters, as both `URLSearchParams` and SvelteKit's read-only page URL offer. */
type Params = Pick<URLSearchParams, 'get'>;

/** The parts of a URL the filter links need. */
type Location = Pick<URL, 'pathname' | 'search' | 'hash'> & { searchParams: Params };

export function readFilters(params: Params): Filters {
	const selection: Selection = {};
	for (const key of DIMENSION_KEYS) {
		const slug = params.get(key)?.toLowerCase();
		const option = DIMENSIONS[key].options.find((each) => each.slug === slug);
		if (option) selection[key] = option;
	}
	const year = Number(params.get('ano'));
	return { year: Number.isInteger(year) && year > 1990 ? year : null, selection };
}

/** The same URL with some parameters set or removed; `null` removes. */
export function withParams(url: Location, changes: Record<string, string | null>): string {
	const params = new URLSearchParams(url.search);
	for (const [key, value] of Object.entries(changes)) {
		if (value === null) params.delete(key);
		else params.set(key, value);
	}
	const search = params.toString();
	return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
}

/** Only the site-wide state, the state, carried by links between pages. */
export function globalSearch(url: Location): string {
	const uf = url.searchParams.get('uf');
	return uf ? `?uf=${encodeURIComponent(uf)}` : '';
}

/** "o estado e a raça/cor", for notices about filters a section ignores. */
export function filterNouns(keys: readonly Dimension[]): string {
	const nouns = keys.map((key) => DIMENSIONS[key].noun);
	if (nouns.length <= 1) return nouns.join('');
	return `${nouns.slice(0, -1).join(', ')} e ${nouns.at(-1) ?? ''}`;
}
