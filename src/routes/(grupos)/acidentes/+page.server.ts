import { DIMENSIONS, readFilters, type Option } from '#lib/filters.ts';
import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

const TEENS = DIMENSIONS.idade.options.find((option) => option.value === 'Até 17');

const asOptions = (values: readonly string[]): Option[] =>
	values.map((value) => ({ slug: value, label: value, value }));

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const filters = readFilters(url.searchParams);
	if (!TEENS) throw new Error('Faixa etária de adolescentes ausente');
	const teens = { ...filters, selection: { ...filters.selection, idade: TEENS } };
	const [
		calendar,
		accidents,
		adolescents,
		truckers,
		benefits,
		social,
		highways,
		cat,
		places,
		cids
	] = await Promise.all([
		warehouse.calendar(),
		warehouse.cubeView('acidentes', filters),
		warehouse.cubeView('acidentes', teens),
		warehouse.cubeView('caminhoneiros', filters),
		warehouse.cubeView('beneficios', filters),
		warehouse.socialProfile(filters.selection.uf?.value ?? null),
		warehouse.highwayDrivers(),
		warehouse.catOptions(),
		warehouse.municipalities(),
		warehouse.cidNames()
	]);
	const uf = filters.selection.uf?.value ?? null;
	const sectors = await warehouse.sectorRanking(accidents.year);
	const named = new Set(
		[...(accidents.slices.municipio ?? []), ...(adolescents.slices.municipio ?? [])].map(
			(slice) => slice.key
		)
	);
	if (filters.selection.municipio) named.add(filters.selection.municipio.value);
	setHeaders(PUBLIC_CACHE);
	return {
		calendar,
		accidents,
		adolescents,
		truckers,
		benefits,
		social,
		highways,
		sectors,
		municipalityNames: Object.fromEntries(
			places.filter((place) => named.has(place.code)).map((place) => [place.code, place.name])
		),
		cidNames: Object.fromEntries(
			(benefits.extras.cid ?? [])
				.map((slice) => slice.key)
				.filter((key) => key !== null)
				.map((key) => [key, cids[key] ?? key])
		),
		options: {
			municipio: uf
				? places
						.filter((place) => place.uf === uf)
						.map((place) => ({ slug: place.code, label: place.name, value: place.code }))
				: [],
			agente: asOptions(cat.agents),
			lesao: asOptions(cat.injuries),
			parte: asOptions(cat.bodyParts)
		},
		years: [...new Set([...accidents.years, ...truckers.years].map((row) => row.year))].toSorted(
			(a, b) => b - a
		),
		benefitsHistory: warehouse.benefitsByYear()
	};
};
