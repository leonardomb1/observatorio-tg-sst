import { calendar } from './catalog/anos.ts';
import { benefitsByYear } from './catalog/beneficios.ts';
import { cubeView } from './catalog/cubos.ts';
import { agentFamilies, bodyPartFamilies, injuryFamilies } from './catalog/causas.ts';
import { socialProfile } from './catalog/desigualdade.ts';
import { slaveRegister } from './catalog/escravidao.ts';
import { europeComparison } from './catalog/europa.ts';
import { mentalHealth } from './catalog/incapacidade.ts';
import { usaSeries, worldComparison } from './catalog/internacional.ts';
import { informality } from './catalog/informalidade.ts';
import { lethalityByType } from './catalog/perfil.ts';
import { highwayDrivers } from './catalog/rodovias.ts';
import { turnover } from './catalog/rotatividade.ts';
import { healthDeaths } from './catalog/sim.ts';
import { sinanNotifications } from './catalog/sinan.ts';
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
	benefitsByYear: () => benefitsByYear(query),
	socialProfile: socialProfile(query),
	cubeView: cubeView(query),
	worldComparison: () => worldComparison(query),
	usaSeries: () => usaSeries(query),
	informality: () => informality(query),
	europeComparison: () => europeComparison(query),
	turnover: () => turnover(query),
	healthDeaths: () => healthDeaths(query),
	mentalHealth: () => mentalHealth(query),
	sinanNotifications: () => sinanNotifications(query),
	highwayDrivers: () => highwayDrivers(query),
	slaveRegister: () => slaveRegister(query)
};

/** Public pages are identical for everyone; the CDN may keep them for a day. */
export const PUBLIC_CACHE = { 'cache-control': 'public, max-age=300, s-maxage=86400' };
