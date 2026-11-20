import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

/** ISO 3166 alpha-3 to alpha-2, for the country names Intl gives in Portuguese. */
const ISO2: Record<string, string> = {
	ARG: 'AR',
	ARM: 'AM',
	AUS: 'AU',
	AUT: 'AT',
	AZE: 'AZ',
	BDI: 'BI',
	BEL: 'BE',
	BGR: 'BG',
	BHR: 'BH',
	BLR: 'BY',
	BLZ: 'BZ',
	BRA: 'BR',
	CAN: 'CA',
	CHE: 'CH',
	CHL: 'CL',
	COL: 'CO',
	CRI: 'CR',
	CYP: 'CY',
	CZE: 'CZ',
	DEU: 'DE',
	DNK: 'DK',
	ECU: 'EC',
	EGY: 'EG',
	ESP: 'ES',
	EST: 'EE',
	FIN: 'FI',
	FRA: 'FR',
	GBR: 'GB',
	GEO: 'GE',
	GRC: 'GR',
	GTM: 'GT',
	HRV: 'HR',
	HUN: 'HU',
	IRL: 'IE',
	ISL: 'IS',
	ISR: 'IL',
	ITA: 'IT',
	JPN: 'JP',
	KAZ: 'KZ',
	KOR: 'KR',
	LKA: 'LK',
	LTU: 'LT',
	LUX: 'LU',
	LVA: 'LV',
	MDA: 'MD',
	MEX: 'MX',
	MLT: 'MT',
	MMR: 'MM',
	MNG: 'MN',
	MUS: 'MU',
	MYS: 'MY',
	NLD: 'NL',
	NOR: 'NO',
	NZL: 'NZ',
	PAN: 'PA',
	PHL: 'PH',
	POL: 'PL',
	PRT: 'PT',
	PSE: 'PS',
	QAT: 'QA',
	ROU: 'RO',
	RUS: 'RU',
	SAU: 'SA',
	SGP: 'SG',
	SVK: 'SK',
	SVN: 'SI',
	SWE: 'SE',
	SYC: 'SC',
	THA: 'TH',
	TKM: 'TM',
	TUR: 'TR',
	UKR: 'UA',
	URY: 'UY',
	USA: 'US',
	UZB: 'UZ',
	ZAF: 'ZA',
	ZWE: 'ZW'
};

const regionNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

function countryName(iso3: string): string {
	const iso2 = ISO2[iso3];
	return iso2 ? (regionNames.of(iso2) ?? iso3) : iso3;
}

const CountryRow = z.object({
	pais_iso3: z.string(),
	ano: z.number().int(),
	taxa_fatal_100k: z.number()
});

const BrazilRow = z.object({ ano: z.number().int(), taxa: z.number().nullable() });

const UsaRow = z.object({
	ano: z.number().int(),
	mortes: z.number(),
	casos_registraveis: z.number(),
	horas_trabalhadas: z.number(),
	trir: z.number().nullable(),
	dart: z.number().nullable()
});

/** Rates above this per 100k workers are publication errors, not risk; they are listed apart. */
const IMPLAUSIBLE_RATE = 100;
/** Older figures no longer describe a country's present. */
const OLDEST_YEAR = 2018;

interface CountryRate {
	iso3: string;
	name: string;
	year: number;
	rate: number;
}

export interface WorldComparison {
	countries: CountryRate[];
	/** Countries left out because their last published rate is implausible. */
	excluded: CountryRate[];
	/** This observatory's rate for Brazil, deaths per 100k formal jobs, last consolidated year. */
	brazil: { year: number; rate: number | null };
	/** Last year ILOSTAT has for Brazil. */
	brazilIlo: CountryRate | null;
}

/** Fatal occupational injury rates by country, each at its last year in ILOSTAT, against Brazil's. */
export function worldComparison(query: Query) {
	return cached('world-comparison', async (): Promise<WorldComparison> => {
		const [latest, brazil] = await Promise.all([
			rows(
				query,
				CountryRow,
				`SELECT t.pais_iso3, t.ano, MAX(t.taxa_fatal_100k) AS taxa_fatal_100k
				FROM taxa_fatal_paises t
				WHERE t.ano = (SELECT MAX(u.ano) FROM taxa_fatal_paises u WHERE u.pais_iso3 = t.pais_iso3)
				GROUP BY t.pais_iso3, t.ano`
			),
			rows(
				query,
				BrazilRow,
				`SELECT ano, obitos_por_100mil_vinculos_sem_adm_publica AS taxa FROM taxa_incidencia_brasil
				WHERE ano_status = 'consolidado' ORDER BY ano DESC LIMIT 1`
			)
		]);
		const own = brazil[0];
		if (!own) throw new Error('Datamart sem ano consolidado para o Brasil');
		const rates = latest.map((row) => ({
			iso3: row.pais_iso3,
			name: countryName(row.pais_iso3),
			year: row.ano,
			rate: row.taxa_fatal_100k
		}));
		const recent = rates.filter((row) => row.year >= OLDEST_YEAR && row.iso3 !== 'BRA');
		return {
			countries: recent.filter((row) => row.rate <= IMPLAUSIBLE_RATE),
			excluded: recent.filter((row) => row.rate > IMPLAUSIBLE_RATE),
			brazil: { year: own.ano, rate: own.taxa },
			brazilIlo: rates.find((row) => row.iso3 === 'BRA') ?? null
		};
	})();
}

export interface UsaYear {
	year: number;
	deaths: number;
	cases: number;
	/** Recordable cases per 100 full-time workers; null where reported hours are implausible. */
	trir: number | null;
	/** Cases with days away, restricted or transferred, per 100 full-time workers. */
	dart: number | null;
}

/** Hours above this mean a unit error in the establishments' reports (2019 sums trillions). */
const MAX_HOURS = 1e12;

/** Injury Tracking Application totals reported to OSHA by US establishments, per year. */
export function usaSeries(query: Query) {
	return cached('usa-series', async (): Promise<UsaYear[]> => {
		const result = await rows(
			query,
			UsaRow,
			'SELECT ano, mortes, casos_registraveis, horas_trabalhadas, trir, dart FROM osha_eua_taxas_ano ORDER BY ano'
		);
		return result.map((row) => {
			const plausible = row.horas_trabalhadas < MAX_HOURS;
			return {
				year: row.ano,
				deaths: row.mortes,
				cases: row.casos_registraveis,
				trir: plausible ? row.trir : null,
				dart: plausible ? row.dart : null
			};
		});
	})();
}
