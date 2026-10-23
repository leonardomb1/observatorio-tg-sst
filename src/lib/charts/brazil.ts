import type { EChartsCoreOption } from 'echarts/core';
import { asset } from '$app/paths';
import { echarts, type ChartTokens } from './theme.ts';

const CLASSES = 5;
/** cos(14°): longitude scale at Brazil's middle latitude; ECharts' default of 0.75 squeezes it. */
const ASPECT = 0.97;

/** What a map covers: the 27 states, or the municipalities of one state. */
export type MapScope = { kind: 'states' } | { kind: 'municipalities'; uf: string };

export interface LoadedMap {
	name: string;
	/** Drawn width over height of the boundaries, after the longitude scale. */
	aspect: number;
}

const loaded = new Map<string, Promise<LoadedMap>>();

function aspectOf(geo: unknown): number {
	let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity];
	const visit = (node: unknown) => {
		if (!Array.isArray(node)) return;
		if (typeof node[0] === 'number' && typeof node[1] === 'number') {
			west = Math.min(west, node[0]);
			east = Math.max(east, node[0]);
			south = Math.min(south, node[1]);
			north = Math.max(north, node[1]);
			return;
		}
		for (const child of node) visit(child);
	};
	for (const feature of (geo as { features: { geometry: { coordinates: unknown } }[] }).features) {
		visit(feature.geometry.coordinates);
	}
	return ((east - west) * ASPECT) / (north - south);
}

/**
 * Registers IBGE's boundaries for a scope once and returns the map's name and proportions. States come
 * with the bundle on first use; each state's municipalities are a static file of their own.
 */
export function loadMap(scope: MapScope): Promise<LoadedMap> {
	const name = scope.kind === 'states' ? 'brasil-uf' : `municipios-${scope.uf}`;
	let promise = loaded.get(name);
	if (!promise) {
		const geo =
			scope.kind === 'states'
				? import('./brasil-uf.json').then((module) => module.default as unknown)
				: fetch(asset(`geo/municipios/${scope.uf}.json` as Parameters<typeof asset>[0])).then(
						(response) => {
							if (!response.ok) throw new Error(`Malha de ${scope.uf} indisponível`);
							return response.json() as Promise<unknown>;
						}
					);
		promise = geo.then((json) => {
			echarts.registerMap(name, json as never);
			return { name, aspect: aspectOf(json) };
		});
		promise.catch(() => loaded.delete(name));
		loaded.set(name, promise);
	}
	return promise;
}

export interface Area {
	/** State abbreviation, or the six-digit municipal code. */
	key: string;
	label: string;
	/** Null draws the area in neutral grey: no data, or a base too small to colour. */
	value: number | null;
}

/** Quintile breaks of the values on screen, so the shades always spread across the areas. */
function breaksOf(values: readonly number[]): number[] {
	const sorted = values.toSorted((a, b) => a - b);
	if (sorted.length === 0) return [];
	return Array.from(
		{ length: CLASSES - 1 },
		(_, index) => sorted[Math.floor(((index + 1) * sorted.length) / CLASSES)] ?? 0
	);
}

export interface MapClass {
	gte?: number;
	lt?: number;
	label: string;
}

/** The five quintile ranges of the values on screen, named for the legend. */
export function mapClasses(areas: readonly Area[], format: (value: number) => string): MapClass[] {
	const breaks = breaksOf(areas.map((area) => area.value).filter((value) => value !== null));
	return Array.from({ length: CLASSES }, (_, index) => {
		const from = index === 0 ? undefined : breaks[index - 1];
		const to = index === CLASSES - 1 ? undefined : breaks[index];
		const label =
			from === undefined && to !== undefined
				? `até ${format(to)}`
				: to === undefined && from !== undefined
					? `${format(from)} ou mais`
					: `${format(from ?? 0)} a ${format(to ?? 0)}`;
		return {
			...(from === undefined ? {} : { gte: from }),
			...(to === undefined ? {} : { lt: to }),
			label
		};
	});
}

/**
 * Choropleth coloured by quintile. The legend is drawn in HTML by the caller, so it can
 * wrap on narrow screens.
 */
export function choropleth(
	tokens: ChartTokens,
	map: string,
	scope: MapScope,
	areas: readonly Area[],
	format: (value: number) => string
): EChartsCoreOption {
	const labels = new Map(areas.map((area) => [area.key, area.label]));
	const pieces = mapClasses(areas, format).map((piece, index) => ({
		...piece,
		color: tokens.rates[index] ?? tokens.ink3
	}));
	const states = scope.kind === 'states';
	return {
		tooltip: {
			trigger: 'item',
			formatter: ({ name, value }: { name: string; value: unknown }) =>
				`${labels.get(name) ?? name}: ${typeof value === 'number' && !Number.isNaN(value) ? format(value) : '—'}`
		},
		visualMap: { type: 'piecewise', show: false, pieces },
		series: [
			{
				type: 'map',
				map,
				nameProperty: states ? 'sigla' : 'cod',
				roam: false,
				aspectScale: ASPECT,
				top: 2,
				bottom: 2,
				left: 2,
				right: 2,
				selectedMode: false,
				itemStyle: {
					areaColor: tokens.neutral,
					borderColor: tokens.paper,
					borderWidth: states ? 0.8 : 0.3
				},
				label: { show: false },
				emphasis: {
					label: { show: states, color: tokens.ink, fontWeight: 600 },
					itemStyle: { areaColor: tokens.accent }
				},
				data: areas.map((area) => ({ name: area.key, value: area.value ?? Number.NaN }))
			}
		]
	};
}
