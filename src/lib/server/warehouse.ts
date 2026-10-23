import { calendar } from './catalog/anos.ts';
import { benefitsByYear } from './catalog/beneficios.ts';
import { agentFamilies, bodyPartFamilies, injuryFamilies } from './catalog/causas.ts';
import { lethalityByType } from './catalog/perfil.ts';
import {
	brazilSeries,
	municipalRates,
	sectorRanking,
	ufRanking,
	ufSeries
} from './catalog/taxas.ts';
import { query } from './starrocks.ts';

/** The catalog bound to the app's read-only StarRocks connection. */
export const warehouse = {
	calendar: () => calendar(query),
	brazilSeries: () => brazilSeries(query),
	ufRanking: ufRanking(query),
	ufSeries: ufSeries(query),
	municipalRates: municipalRates(query),
	sectorRanking: sectorRanking(query),
	lethalityByType: () => lethalityByType(query),
	agentFamilies: agentFamilies(query),
	bodyPartFamilies: bodyPartFamilies(query),
	injuryFamilies: injuryFamilies(query),
	benefitsByYear: () => benefitsByYear(query)
};

/** Public pages are identical for everyone; the CDN may keep them for a day. */
export const PUBLIC_CACHE = { 'cache-control': 'public, max-age=300, s-maxage=86400' };
