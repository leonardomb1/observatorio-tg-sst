import * as z from 'zod';
import type { Dimension, Filters, Selection } from '#lib/filters.ts';
import type { YearStatus } from '#lib/status.ts';
import { cached, rows, type Param, type Query } from './query.ts';

interface Measure {
	key: string;
	sql: string;
}

interface Extra {
	key: string;
	sql: string;
}

interface CubeDef {
	table: string;
	year: string;
	where?: string;
	dims: Partial<Record<Dimension, string>>;
	measures: readonly Measure[];
	/** Aggregate giving the year's status: 'consolidado', 'provisorio' or 'parcial'. */
	status: string;
	extras?: readonly Extra[];
	/** Formal jobs from cubo_emprego as denominator, valid while every active filter is one of these. */
	jobs?: readonly Dimension[];
}

const flagged = (flag: string, status: YearStatus) =>
	`CASE WHEN MAX(CASE WHEN ${flag} THEN 1 ELSE 0 END) = 1 THEN '${status}' ELSE 'consolidado' END`;

const sum = (key: string, column = key): Measure => ({ key, sql: `SUM(${column})` });

/**
 * The filterable topics. Accident rates divide by formal jobs without public
 * administration (CNAE section O), and their numerator keeps only accidents
 * with a known state, as the official yearbook does.
 */
const CUBES = {
	acidentes: {
		table: 'cubo_acidentes',
		year: 'ano',
		dims: {
			uf: 'uf_sigla',
			sexo: 'sexo',
			idade: 'faixa_etaria',
			atividade: 'cnae_secao',
			ocupacao: 'cbo_grande_grupo'
		},
		measures: [
			sum('acidentes'),
			sum('obitos'),
			sum(
				'acidentes_base',
				"CASE WHEN uf_sigla IS NOT NULL AND coalesce(cnae_secao, '') <> 'O' THEN acidentes ELSE 0 END"
			),
			sum(
				'obitos_base',
				"CASE WHEN uf_sigla IS NOT NULL AND coalesce(cnae_secao, '') <> 'O' THEN obitos ELSE 0 END"
			)
		],
		status: 'MAX(ano_status)',
		extras: [{ key: 'tipo', sql: 'tipo_acidente' }],
		jobs: ['uf', 'atividade']
	},
	caminhoneiros: {
		table: 'cubo_prf',
		year: 'ano',
		where: "categoria_veiculo = 'Caminhão' AND condutor = 1",
		dims: { uf: 'uf_sigla', sexo: 'sexo', idade: 'faixa_etaria' },
		measures: [sum('condutores', 'envolvidos'), sum('obitos'), sum('feridos_graves')],
		status: flagged('NOT ano_completo', 'parcial')
	},
	'saude-mental': {
		table: 'cubo_incapacidade',
		year: 'ano',
		where:
			"grupo_cid = 'Transtornos mentais e comportamentais' AND tipo_incapacidade = 'temporaria'",
		dims: { uf: 'uf_sigla', sexo: 'sexo' },
		measures: [
			sum('concessoes'),
			sum('acidentarias', "CASE WHEN natureza = 'acidentaria' THEN concessoes ELSE 0 END")
		],
		status: flagged('NOT (ano_completo AND cid_confiavel)', 'parcial')
	},
	'notificacoes-sus': {
		table: 'cubo_sinan',
		year: 'ano',
		dims: {
			uf: 'uf_sigla',
			sexo: 'sexo',
			idade: 'faixa_etaria',
			raca: 'raca_cor',
			ocupacao: 'cbo_grande_grupo'
		},
		measures: [sum('notificacoes'), sum('com_cat'), sum('cat_informada'), sum('obitos')],
		status: flagged('preliminar', 'provisorio'),
		extras: [
			{ key: 'agravo', sql: 'agravo_nome' },
			{ key: 'situacao', sql: 'situacao_trabalho' }
		]
	},
	'mortes-no-sus': {
		table: 'cubo_sim',
		year: 'ano',
		where: "situacao_acidtrab = 'sim'",
		dims: {
			uf: 'uf_sigla',
			sexo: 'sexo',
			idade: 'faixa_etaria',
			raca: 'raca_cor',
			ocupacao: 'cbo_grande_grupo'
		},
		measures: [sum('obitos')],
		status: flagged('preliminar', 'provisorio'),
		extras: [{ key: 'causa', sql: 'grupo_causa' }]
	},
	rotatividade: {
		table: 'cubo_emprego',
		year: 'ano',
		where: 'meses_caged > 0',
		dims: { uf: 'uf_sigla', atividade: 'cnae_secao' },
		measures: [sum('vinculos', 'vinculos_ativos'), sum('admissoes'), sum('desligamentos')],
		status: "CASE WHEN MIN(meses_caged) = 12 THEN 'consolidado' ELSE 'parcial' END"
	},
	'trabalho-escravo': {
		table: 'trabalho_escravo_cadastro',
		year: 'ano_acao_fiscal',
		where: 'ano_acao_fiscal IS NOT NULL',
		dims: { uf: 'uf_sigla', atividade: 'cnae_secao' },
		measures: [sum('trabalhadores'), sum('empregadores')],
		status: "'consolidado'"
	}
} satisfies Record<string, CubeDef>;

export type CubeKey = keyof typeof CUBES;

export interface Slice {
	key: string | null;
	values: Record<string, number | null>;
	/** Formal jobs behind the slice, when the cube has a job denominator for the active filters. */
	jobs: number | null;
}

interface YearSlice extends Slice {
	year: number;
	status: YearStatus;
}

export interface CubeView {
	cube: CubeKey;
	year: number;
	status: YearStatus;
	/** Set when the requested year is missing from this source. */
	requestedYear: number | null;
	years: YearSlice[];
	/** Active filters this source cannot apply. */
	ignored: Dimension[];
	/** Whether the slices carry formal jobs. */
	rated: boolean;
	slices: Partial<Record<Dimension, Slice[]>>;
	extras: Record<string, Slice[]>;
}

const status = z.enum(['consolidado', 'provisorio', 'parcial']);

function predicates(def: CubeDef, selection: Selection, skip: Dimension | null) {
	const sql = def.where ? [def.where] : [];
	const params: Param[] = [];
	for (const [key, column] of Object.entries(def.dims) as [Dimension, string][]) {
		const option = selection[key];
		if (!option || key === skip) continue;
		sql.push(`${column} = ?`);
		params.push(option.value);
	}
	return { sql, params };
}

const JOB_COLUMNS: Partial<Record<Dimension, string>> = { uf: 'uf_sigla', atividade: 'cnae_secao' };

function jobPredicates(selection: Selection, skip: Dimension | null) {
	const sql = ["cnae_secao <> 'O'"];
	const params: Param[] = [];
	for (const [key, column] of Object.entries(JOB_COLUMNS) as [Dimension, string][]) {
		const option = selection[key];
		if (!option || key === skip) continue;
		sql.push(`${column} = ?`);
		params.push(option.value);
	}
	return { sql, params };
}

function measureSchema(def: CubeDef) {
	return Object.fromEntries(def.measures.map((measure) => [measure.key, z.number().nullable()]));
}

function toValues(def: CubeDef, row: Record<string, unknown>) {
	return Object.fromEntries(
		def.measures.map((measure) => [measure.key, (row[measure.key] as number | null) ?? null])
	);
}

const JobRow = z.object({
	chave: z.union([z.string(), z.number()]).nullable(),
	vinculos: z.number()
});

async function jobsBy(
	query: Query,
	column: string,
	selection: Selection,
	skip: Dimension | null,
	year: number | null
) {
	const where = jobPredicates(selection, skip);
	if (year !== null) {
		where.sql.push('ano = ?');
		where.params.push(year);
	}
	const result = await rows(
		query,
		JobRow,
		`SELECT ${column} AS chave, SUM(vinculos_ativos) AS vinculos FROM cubo_emprego
		WHERE ${where.sql.join(' AND ')} GROUP BY ${column}`,
		where.params
	);
	return new Map(result.map((row) => [String(row.chave), row.vinculos]));
}

async function load(query: Query, cube: CubeKey, requested: number | null, selection: Selection) {
	const def: CubeDef = CUBES[cube];
	const ignored = (Object.keys(selection) as Dimension[]).filter((key) => !(key in def.dims));
	const active = (Object.keys(selection) as Dimension[]).filter((key) => key in def.dims);
	const rated = def.jobs !== undefined && active.every((key) => def.jobs?.includes(key));
	const select = def.measures.map((measure) => `${measure.sql} AS ${measure.key}`).join(', ');

	const all = predicates(def, selection, null);
	const series = await rows(
		query,
		z.object({ ano: z.number().int(), status, ...measureSchema(def) }),
		`SELECT ${def.year} AS ano, ${def.status} AS status, ${select} FROM ${def.table}
		${all.sql.length ? `WHERE ${all.sql.join(' AND ')}` : ''}
		GROUP BY ${def.year} ORDER BY ${def.year}`,
		all.params
	);
	const jobsByYear = rated ? await jobsBy(query, 'ano', selection, null, null) : null;
	const years: YearSlice[] = series.map((row) => ({
		year: row.ano,
		status: row.status,
		key: String(row.ano),
		values: toValues(def, row),
		jobs: jobsByYear?.get(String(row.ano)) ?? null
	}));
	const available = years.filter((row) => (row.values[def.measures[0]?.key ?? ''] ?? 0) > 0);
	const chosen =
		available.find((row) => row.year === requested) ??
		available.findLast((row) => row.status === 'consolidado') ??
		available.at(-1);
	if (!chosen) throw new Error(`Cubo ${cube} sem dados`);

	const slice = async (column: string, skip: Dimension | null, jobColumn: string | null) => {
		const where = predicates(def, selection, skip);
		where.sql.push(`${def.year} = ?`);
		where.params.push(chosen.year);
		const [result, jobs] = await Promise.all([
			rows(
				query,
				z.object({ chave: z.union([z.string(), z.number()]).nullable(), ...measureSchema(def) }),
				`SELECT ${column} AS chave, ${select} FROM ${def.table}
				WHERE ${where.sql.join(' AND ')} GROUP BY ${column}`,
				where.params
			),
			rated && jobColumn ? jobsBy(query, jobColumn, selection, skip, chosen.year) : null
		]);
		return result.map((row) => {
			const key = row.chave === null ? null : String(row.chave);
			return {
				key,
				values: toValues(def, row),
				jobs: key === null ? null : (jobs?.get(key) ?? null)
			};
		});
	};

	const dims = Object.entries(def.dims) as [Dimension, string][];
	const [dimSlices, extraSlices] = await Promise.all([
		Promise.all(dims.map(([key, column]) => slice(column, key, JOB_COLUMNS[key] ?? null))),
		Promise.all((def.extras ?? []).map((extra) => slice(extra.sql, null, null)))
	]);
	return {
		cube,
		year: chosen.year,
		status: chosen.status,
		requestedYear: requested !== null && requested !== chosen.year ? requested : null,
		years,
		ignored,
		rated,
		slices: Object.fromEntries(dims.map(([key], index) => [key, dimSlices[index] ?? []])),
		extras: Object.fromEntries(
			(def.extras ?? []).map((extra, index) => [extra.key, extraSlices[index] ?? []])
		)
	} satisfies CubeView;
}

/** One topic sliced by year, by each of its dimensions and by its extra breakdowns, under the page filters. */
export function cubeView(query: Query) {
	const read = cached('cube', (cube: string, year: number | null, selection: string) =>
		load(query, cube as CubeKey, year, JSON.parse(selection) as Selection)
	);
	return (cube: CubeKey, filters: Filters) => {
		const selection = Object.fromEntries(
			Object.entries(filters.selection).toSorted(([a], [b]) => a.localeCompare(b))
		);
		return read(cube, filters.year, JSON.stringify(selection));
	};
}
