import * as z from 'zod';
import type { YearStatus } from '#lib/status.ts';
import { cached, rows, type Query } from './query.ts';

const status = z.enum(['consolidado', 'provisorio', 'parcial']);

const RateColumns = {
	ano: z.number().int(),
	ano_status: status,
	vinculos_sem_adm_publica: z.number(),
	acidentes_sem_adm_publica: z.number(),
	obitos_sem_adm_publica: z.number(),
	acidentes_por_100mil_vinculos_sem_adm_publica: z.number().nullable(),
	obitos_por_100mil_vinculos_sem_adm_publica: z.number().nullable(),
	acidentes: z.number(),
	obitos: z.number(),
	acidentes_por_100mil_vinculos: z.number().nullable(),
	obitos_por_100mil_vinculos: z.number().nullable(),
	pct_nao_alocavel: z.number().nullable()
};

const SELECT_RATES = `ano, ano_status, vinculos_sem_adm_publica, acidentes_sem_adm_publica,
	obitos_sem_adm_publica, acidentes_por_100mil_vinculos_sem_adm_publica,
	obitos_por_100mil_vinculos_sem_adm_publica, acidentes, obitos,
	acidentes_por_100mil_vinculos, obitos_por_100mil_vinculos, pct_nao_alocavel`;

/**
 * Rates use the default denominator: formal jobs without public administration
 * (CNAE division 84), whose statutory servants do not file CATs with the INSS.
 */
interface Rate {
	year: number;
	status: YearStatus;
	jobs: number;
	accidents: number;
	deaths: number;
	accidentRate: number | null;
	deathRate: number | null;
	accidentRateAllJobs: number | null;
	unallocatedPct: number | null;
	/** Counts over all formal jobs, public administration included. */
	allAccidents: number;
	allDeaths: number;
}

function toRate(row: z.infer<z.ZodObject<typeof RateColumns>>): Rate {
	return {
		year: row.ano,
		status: row.ano_status,
		jobs: row.vinculos_sem_adm_publica,
		accidents: row.acidentes_sem_adm_publica,
		deaths: row.obitos_sem_adm_publica,
		accidentRate: row.acidentes_por_100mil_vinculos_sem_adm_publica,
		deathRate: row.obitos_por_100mil_vinculos_sem_adm_publica,
		accidentRateAllJobs: row.acidentes_por_100mil_vinculos,
		unallocatedPct: row.pct_nao_alocavel,
		allAccidents: row.acidentes,
		allDeaths: row.obitos
	};
}

const BrazilRow = z.object(RateColumns);

export function brazilSeries(query: Query) {
	return cached('brazil-series', async () => {
		const result = await rows(
			query,
			BrazilRow,
			`SELECT ${SELECT_RATES} FROM taxa_incidencia_brasil WHERE ano IS NOT NULL ORDER BY ano`
		);
		return result.map(toRate);
	})();
}

const UfRow = z.object({
	...RateColumns,
	uf: z.string(),
	uf_sigla: z.string(),
	regiao: z.string()
});

interface UfRate extends Rate {
	uf: string;
	name: string;
	region: string;
}

function toUfRate(row: z.infer<typeof UfRow>): UfRate {
	return { ...toRate(row), uf: row.uf_sigla, name: row.uf, region: row.regiao };
}

export const ufRanking = (query: Query) =>
	cached('uf-ranking', async (year: number) => {
		const result = await rows(
			query,
			UfRow,
			`SELECT ${SELECT_RATES}, uf, uf_sigla, regiao FROM taxa_incidencia_uf WHERE ano = ? ORDER BY uf`,
			[year]
		);
		return result.map(toUfRate);
	});

export const ufSeries = (query: Query) =>
	cached('uf-series', async (uf: string) => {
		const result = await rows(
			query,
			UfRow,
			`SELECT ${SELECT_RATES}, uf, uf_sigla, regiao FROM taxa_incidencia_uf WHERE uf_sigla = ? ORDER BY ano`,
			[uf]
		);
		return result.map(toUfRate);
	});

const CnaeRow = z.object({
	ano: z.number().int(),
	ano_status: status,
	cnae_codigo: z.string(),
	cnae_descricao: z.string().nullable(),
	vinculos_ativos: z.number(),
	acidentes: z.number(),
	obitos: z.number(),
	acidentes_por_100mil_vinculos: z.number().nullable(),
	obitos_por_100mil_vinculos: z.number().nullable(),
	base_minima: z.number().int()
});

export interface SectorRate {
	code: string;
	name: string;
	jobs: number;
	accidents: number;
	deaths: number;
	accidentRate: number | null;
	deathRate: number | null;
	/** Jobs a class needs to enter the ranking, as set in the datamart. */
	minimumJobs: number;
}

/** Only classes above the minimum base, where one death does not swing the rate. */
export const sectorRanking = (query: Query) =>
	cached('sector-ranking', async (year: number) => {
		const result = await rows(
			query,
			CnaeRow,
			`SELECT ano, ano_status, cnae_codigo, cnae_descricao, vinculos_ativos, acidentes, obitos,
				acidentes_por_100mil_vinculos, obitos_por_100mil_vinculos, base_minima
			FROM taxa_incidencia_cnae WHERE ano = ? AND base_suficiente`,
			[year]
		);
		return result.map((row): SectorRate => ({
			code: row.cnae_codigo,
			name: row.cnae_descricao ?? `CNAE ${row.cnae_codigo}`,
			jobs: row.vinculos_ativos,
			accidents: row.acidentes,
			deaths: row.obitos,
			accidentRate: row.acidentes_por_100mil_vinculos,
			deathRate: row.obitos_por_100mil_vinculos,
			minimumJobs: row.base_minima
		}));
	});

const MunicipalityRow = z.object({
	municipio_codigo: z.string(),
	municipio: z.string().nullable(),
	vinculos_sem_adm_publica: z.number(),
	acidentes_sem_adm_publica: z.number(),
	obitos_sem_adm_publica: z.number(),
	acidentes_por_100mil_vinculos_sem_adm_publica: z.number().nullable(),
	obitos_por_100mil_vinculos_sem_adm_publica: z.number().nullable(),
	base_suficiente: z.number().int(),
	base_minima: z.number().int()
});

export interface MunicipalRate {
	/** Six-digit IBGE code, without the check digit, as published in the CAT. */
	code: string;
	name: string;
	jobs: number;
	accidents: number;
	deaths: number;
	accidentRate: number | null;
	deathRate: number | null;
	/** Below the minimum base the rate swings too much to be read on its own. */
	enoughJobs: boolean;
	minimumJobs: number;
}

/** Every municipality of a state in a year, with the default denominator. */
export const municipalRates = (query: Query) =>
	cached('municipal-rates', async (uf: string, year: number) => {
		const result = await rows(
			query,
			MunicipalityRow,
			`SELECT municipio_codigo, municipio, vinculos_sem_adm_publica, acidentes_sem_adm_publica,
				obitos_sem_adm_publica, acidentes_por_100mil_vinculos_sem_adm_publica,
				obitos_por_100mil_vinculos_sem_adm_publica, base_suficiente, base_minima
			FROM taxa_incidencia_municipio WHERE uf_sigla = ? AND ano = ?`,
			[uf, year]
		);
		return result.map((row): MunicipalRate => ({
			code: row.municipio_codigo,
			name: row.municipio ?? `Município ${row.municipio_codigo}`,
			jobs: row.vinculos_sem_adm_publica,
			accidents: row.acidentes_sem_adm_publica,
			deaths: row.obitos_sem_adm_publica,
			accidentRate: row.acidentes_por_100mil_vinculos_sem_adm_publica,
			deathRate: row.obitos_por_100mil_vinculos_sem_adm_publica,
			enoughJobs: row.base_suficiente === 1,
			minimumJobs: row.base_minima
		}));
	});
