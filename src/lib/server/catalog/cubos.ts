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
	/** Keeps only the largest groups by the first measure. */
	limit?: number;
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
	/** People employed (PNAD, 4th quarter) as denominator, valid while the only active filter is the state. */
	people?: boolean;
	/** Month column, for the month-by-month series across years. */
	month?: string;
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
		table: 'cat_fato',
		year: 'ano',
		dims: {
			uf: 'uf_sigla',
			municipio: 'municipio_codigo',
			sexo: 'sexo',
			idade: 'faixa_etaria',
			atividade: 'cnae_secao',
			ocupacao: 'cbo_grande_grupo',
			tipo: 'tipo_acidente',
			agente: 'agente_familia',
			lesao: 'natureza_familia',
			parte: 'parte_familia'
		},
		measures: [
			{ key: 'acidentes', sql: 'COUNT(*)' },
			sum('obitos', 'CASE WHEN obito THEN 1 ELSE 0 END'),
			sum(
				'acidentes_base',
				"CASE WHEN uf_sigla IS NOT NULL AND coalesce(cnae_secao, '') <> 'O' THEN 1 ELSE 0 END"
			),
			sum(
				'obitos_base',
				"CASE WHEN obito AND uf_sigla IS NOT NULL AND coalesce(cnae_secao, '') <> 'O' THEN 1 ELSE 0 END"
			)
		],
		status: 'MAX(ano_status)',
		extras: [
			{ key: 'mes', sql: 'CAST(mes AS VARCHAR)' },
			{ key: 'dia', sql: 'CAST(dia_semana AS VARCHAR)' },
			{ key: 'cid', sql: 'cid10_capitulo' },
			{ key: 'familia', sql: 'cbo_familia', limit: 25 },
			{ key: 'emitente', sql: 'emitente_cat' }
		],
		jobs: ['uf', 'atividade'],
		people: true,
		month: 'mes'
	},
	beneficios: {
		table: 'beneficios_fato',
		year: 'ano',
		dims: { uf: 'uf_sigla', sexo: 'sexo', idade: 'faixa_etaria', atividade: 'cnae_secao' },
		measures: [
			{ key: 'concessoes', sql: 'COUNT(*)' },
			sum('com_duracao', 'CASE WHEN dias_previstos IS NOT NULL THEN 1 ELSE 0 END'),
			sum('dias', 'dias_previstos'),
			sum('despesa', 'despesa_prevista_sm')
		],
		status: flagged('NOT ano_completo', 'parcial'),
		extras: [
			{ key: 'especie', sql: 'especie_codigo' },
			{ key: 'grupo', sql: 'grupo_cid' },
			{ key: 'cid', sql: 'cid10_categoria', limit: 20 }
		],
		jobs: ['uf'],
		month: 'mes'
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
		status: flagged('NOT (ano_completo AND cid_confiavel)', 'parcial'),
		extras: [{ key: 'cid', sql: 'cid10_categoria', limit: 15 }]
	},
	'notificacoes-sus': {
		table: 'cubo_sinan',
		year: 'ano',
		dims: {
			uf: 'uf_sigla',
			sexo: 'sexo',
			idade: 'faixa_etaria',
			raca: 'raca_cor',
			ocupacao: 'cbo_grande_grupo',
			agravo: 'agravo'
		},
		measures: [sum('notificacoes'), sum('com_cat'), sum('cat_informada'), sum('obitos')],
		status: flagged('preliminar', 'provisorio'),
		people: true,
		extras: [{ key: 'situacao', sql: 'situacao_trabalho' }]
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
		people: true,
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
	/** People employed behind the slice (PNAD), when the cube has that denominator for the active filters. */
	people: number | null;
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
	/** Whether the year and state slices carry people employed. */
	perPerson: boolean;
	/** Month by month across all years, oldest first; empty when the cube has no month. */
	months: (Slice & { year: number; month: number })[];
	slices: Partial<Record<Dimension, Slice[]>>;
	extras: Record<string, Slice[]>;
}

const status = z.enum(['consolidado', 'provisorio', 'parcial']);

/** Without a state, the municipality breakdown keeps the largest ones only. */
const MUNICIPALITIES_WITHOUT_UF = 30;

/** A breakdown by state drops the municipality too, which would pin it to one state. */
const skipped = (key: Dimension, skip: Dimension | null) =>
	key === skip || (skip === 'uf' && key === 'municipio');

function predicates(def: CubeDef, selection: Selection, skip: Dimension | null) {
	const sql = def.where ? [def.where] : [];
	const params: Param[] = [];
	for (const [key, column] of Object.entries(def.dims) as [Dimension, string][]) {
		const option = selection[key];
		if (!option || skipped(key, skip)) continue;
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

const STATES = 27;

const PeopleRow = z.object({
	chave: z.union([z.string(), z.number()]).nullable(),
	ocupados: z.number().nullable()
});

/** People employed from the PNAD by year or by state; a national total needs every state. */
async function peopleBy(
	query: Query,
	column: 'ano' | 'uf_sigla',
	uf: string | null,
	year: number | null
) {
	const where = ['c.ocupados_mil IS NOT NULL'];
	const params: Param[] = [];
	if (uf && column === 'ano') {
		where.push('u.uf_sigla = ?');
		params.push(uf);
	}
	if (year !== null) {
		where.push('c.ano = ?');
		params.push(year);
	}
	const result = await rows(
		query,
		PeopleRow,
		`SELECT ${column === 'ano' ? 'c.ano' : 'u.uf_sigla'} AS chave, SUM(c.ocupados_mil) * 1000 AS ocupados
		FROM cobertura_denominador_uf c JOIN dim_uf u ON u.uf_nome = c.uf
		WHERE ${where.join(' AND ')} GROUP BY ${column === 'ano' ? 'c.ano' : 'u.uf_sigla'}
		${column === 'ano' && !uf ? `HAVING COUNT(*) = ${String(STATES)}` : ''}`,
		params
	);
	return new Map(result.map((row) => [String(row.chave), row.ocupados]));
}

async function load(query: Query, cube: CubeKey, requested: number | null, selection: Selection) {
	const def: CubeDef = CUBES[cube];
	const ignored = (Object.keys(selection) as Dimension[]).filter((key) => !(key in def.dims));
	const active = (Object.keys(selection) as Dimension[]).filter((key) => key in def.dims);
	const rated = def.jobs !== undefined && active.every((key) => def.jobs?.includes(key));
	const perPerson = def.people === true && active.every((key) => key === 'uf');
	const uf = selection.uf?.value ?? null;
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
	const [jobsByYear, peopleByYear] = await Promise.all([
		rated ? jobsBy(query, 'ano', selection, null, null) : null,
		perPerson ? peopleBy(query, 'ano', uf, null) : null
	]);
	const years: YearSlice[] = series.map((row) => ({
		year: row.ano,
		status: row.status,
		key: String(row.ano),
		values: toValues(def, row),
		jobs: jobsByYear?.get(String(row.ano)) ?? null,
		people: peopleByYear?.get(String(row.ano)) ?? null
	}));
	const available = years.filter((row) => (row.values[def.measures[0]?.key ?? ''] ?? 0) > 0);
	const chosen =
		available.find((row) => row.year === requested) ??
		available.findLast((row) => row.status === 'consolidado') ??
		available.at(-1);
	if (!chosen) throw new Error(`Cubo ${cube} sem dados`);

	const first = def.measures[0]?.key ?? '';
	const slice = async (
		column: string,
		skip: Dimension | null,
		jobColumn: string | null,
		limit?: number
	) => {
		const where = predicates(def, selection, skip);
		where.sql.push(`${def.year} = ?`);
		where.params.push(chosen.year);
		const [result, jobs, people] = await Promise.all([
			rows(
				query,
				z.object({ chave: z.union([z.string(), z.number()]).nullable(), ...measureSchema(def) }),
				`SELECT ${column} AS chave, ${select} FROM ${def.table}
				WHERE ${where.sql.join(' AND ')} GROUP BY ${column}
				${limit ? `ORDER BY ${first} DESC LIMIT ${String(limit)}` : ''}`,
				where.params
			),
			rated && jobColumn ? jobsBy(query, jobColumn, selection, skip, chosen.year) : null,
			perPerson && skip === 'uf' ? peopleBy(query, 'uf_sigla', null, chosen.year) : null
		]);
		return result.map((row) => {
			const key = row.chave === null ? null : String(row.chave);
			return {
				key,
				values: toValues(def, row),
				jobs: key === null ? null : (jobs?.get(key) ?? null),
				people: key === null ? null : (people?.get(key) ?? null)
			};
		});
	};

	const monthly = async () => {
		if (!def.month) return [];
		const result = await rows(
			query,
			z.object({ ano: z.number().int(), mes: z.number().int(), ...measureSchema(def) }),
			`SELECT ${def.year} AS ano, ${def.month} AS mes, ${select} FROM ${def.table}
			${all.sql.length ? `WHERE ${all.sql.join(' AND ')}` : ''}
			GROUP BY ${def.year}, ${def.month} ORDER BY ${def.year}, ${def.month}`,
			all.params
		);
		return result.map((row) => ({
			year: row.ano,
			month: row.mes,
			key: `${String(row.ano)}-${String(row.mes)}`,
			values: toValues(def, row),
			jobs: null,
			people: null
		}));
	};

	const dims = Object.entries(def.dims) as [Dimension, string][];
	const [dimSlices, extraSlices, months] = await Promise.all([
		Promise.all(
			dims.map(([key, column]) =>
				slice(
					column,
					key,
					JOB_COLUMNS[key] ?? null,
					key === 'municipio' && !selection.uf ? MUNICIPALITIES_WITHOUT_UF : undefined
				)
			)
		),
		Promise.all((def.extras ?? []).map((extra) => slice(extra.sql, null, null, extra.limit))),
		monthly()
	]);
	return {
		cube,
		year: chosen.year,
		status: chosen.status,
		requestedYear: requested !== null && requested !== chosen.year ? requested : null,
		years,
		ignored,
		rated,
		perPerson,
		months,
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
