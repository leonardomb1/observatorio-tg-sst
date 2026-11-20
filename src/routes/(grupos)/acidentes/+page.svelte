<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import CubePanels from '#lib/components/grupo/CubePanels.svelte';
	import GroupPage from '#lib/components/grupo/GroupPage.svelte';
	import ScopeNote from '#lib/components/grupo/ScopeNote.svelte';
	import StorySection from '#lib/components/StorySection.svelte';
	import { readFilters, type Dimension } from '#lib/filters.ts';
	import { average, count, perJobs, perPeople, perThousand, total } from '#lib/metrics.ts';
	import { catSource, topicSource } from '#lib/sources.ts';
	import { findGroup } from '#lib/topics.ts';
	import Beneficios from './Beneficios.svelte';
	import Caminhoneiros from './Caminhoneiros.svelte';
	import ClassesCnae from './ClassesCnae.svelte';
	import Desigualdade from './Desigualdade.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const group = findGroup('acidentes');
	const summary = (id: string) => group.sections.find((each) => each.id === id)?.summary;
	const filters = $derived(readFilters(page.url.searchParams));
	const active = $derived(Object.keys(filters.selection) as Dimension[]);
	const socialDims = group.sections.find((each) => each.id === 'raca-escolaridade')?.dims ?? [];

	const source = $derived(catSource(data.calendar.publishedUntil));
	const BASE = 'por 100 mil vínculos formais, sem administração pública';
	const accidents = count('acidentes', 'Acidentes', 'acidentes', 'Acidentes com CAT');
	const deaths = count('obitos', 'Óbitos', 'óbitos', 'Óbitos com CAT');
	const lethality = perThousand(
		'obitos',
		'acidentes',
		'Óbitos por mil acidentes',
		'óbitos',
		'Óbitos por mil acidentes com CAT'
	);
	const accidentRate = perJobs(
		'acidentes_base',
		'Acidentes por 100 mil',
		'acidentes',
		`Acidentes com CAT ${BASE}`
	);
	const deathRate = perJobs(
		'obitos_base',
		'Óbitos por 100 mil',
		'óbitos',
		`Óbitos com CAT ${BASE}`,
		2
	);
	const accidentIncidence = perPeople(
		'acidentes',
		'Acidentes por 100 mil ocupados',
		'acidentes',
		'Acidentes com CAT por 100 mil pessoas ocupadas (PNAD, formais e informais)'
	);
	/** Rates first when the filters allow a job denominator, counts otherwise. */
	const rated = $derived(
		data.accidents.rated
			? [
					accidentRate,
					deathRate,
					...(data.accidents.perPerson ? [accidentIncidence] : []),
					accidents,
					deaths
				]
			: [accidents, deaths, lethality]
	);
	const causes = [accidents, deaths, lethality];

	const MONTHS = [
		'jan',
		'fev',
		'mar',
		'abr',
		'mai',
		'jun',
		'jul',
		'ago',
		'set',
		'out',
		'nov',
		'dez'
	];
	const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
	const labels = $derived({
		municipio: data.municipalityNames,
		mes: Object.fromEntries(MONTHS.map((name, index) => [String(index + 1), name])),
		dia: Object.fromEntries(WEEKDAYS.map((name, index) => [String(index + 1), name]))
	});

	const truckSource = $derived(
		topicSource('prf', `acidentes até ${data.truckers.years.at(-1)?.year ?? '—'}`)
	);
	const truckDeaths = count('obitos', 'Óbitos', 'óbitos', 'Condutores de caminhão mortos');
	const truckDrivers = count(
		'condutores',
		'Condutores envolvidos',
		'condutores',
		'Condutores de caminhão envolvidos em acidentes'
	);

	const grants = count(
		'concessoes',
		'Concessões',
		'concessões',
		'Benefícios acidentários concedidos pelo INSS'
	);
	const grantRate = perJobs(
		'concessoes',
		'Concessões por 100 mil',
		'concessões',
		`Benefícios acidentários concedidos ${BASE}`
	);
	const leaveDays = average(
		'dias',
		'com_duracao',
		'Dias previstos (média)',
		'dias',
		'Duração prevista média do auxílio temporário acidentário (B91), em dias, de jun/2023 em diante'
	);
	const spending = total(
		'despesa',
		'Despesa prevista (salários mínimos)',
		'salários mínimos',
		'Despesa prevista em salários mínimos: renda mensal inicial × meses previstos, de jun/2023 em diante'
	);
	const grantMetrics = $derived(
		data.benefits.rated ? [grants, grantRate, leaveDays, spending] : [grants, leaveDays, spending]
	);
	const benefitLabels = $derived({
		especie: {
			'91': 'Auxílio por incapacidade temporária (B91)',
			'92': 'Aposentadoria por incapacidade permanente (B92)',
			'93': 'Pensão por morte (B93)',
			'94': 'Auxílio-acidente (B94)',
			'95': 'Auxílio suplementar (B95)'
		},
		cid: data.cidNames
	});
	const inssSource = $derived(
		topicSource(
			'incapacidade',
			`concessões de ${data.benefits.years[0]?.year ?? '—'} a ${data.benefits.years.at(-1)?.year ?? '—'}`
		)
	);

	const READER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
	const SETTLE_MS = 1000;

	/**
	 * The streamed benefits history grows the page after the jump to an anchor and
	 * pushes the target down. While it arrives, every resize pins the target back
	 * in place; pinning stops once it is in, or as soon as the reader scrolls, taps or types.
	 */
	const keepAnchor: Attachment<HTMLElement> = (story) => {
		const id = untrack(() => decodeURIComponent(page.url.hash.slice(1)));
		const target = id ? document.getElementById(id) : null;
		if (!target) return;
		const pin = () => {
			target.scrollIntoView({ behavior: 'instant' });
		};
		const resize = new ResizeObserver(pin);
		let timer: ReturnType<typeof setTimeout> | undefined;
		const release = () => {
			resize.disconnect();
			clearTimeout(timer);
			for (const type of READER_INPUT) removeEventListener(type, release);
		};
		resize.observe(story);
		for (const type of READER_INPUT) addEventListener(type, release, { passive: true });
		const streamed = untrack(() => data.benefitsHistory);
		void Promise.allSettled([streamed]).then(() => {
			timer = setTimeout(release, SETTLE_MS);
		});
		return release;
	};
</script>

<GroupPage {group} years={data.years} options={data.options}>
	<div {@attach keepAnchor}>
		<StorySection id="visao-geral" icon="chart" title="Visão geral">
			{#snippet lede()}<p>{summary('visao-geral')}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[
					{ kind: 'serie', metrics: [accidents, deaths] },
					{
						kind: 'serie',
						metrics: data.accidents.rated
							? [accidentRate, deathRate, ...(data.accidents.perPerson ? [accidentIncidence] : [])]
							: [lethality]
					},
					{ kind: 'mensal', metrics: [accidents, deaths] },
					{ kind: 'dim', dim: 'tipo', metrics: causes },
					{
						kind: 'extra',
						key: 'emitente',
						title: 'Quem emitiu a CAT',
						metrics: [accidents, deaths]
					}
				]}
				{source}
				{labels}
				slug="acidentes"
			/>
		</StorySection>

		<StorySection id="estados" icon="map" title="Onde o risco é maior">
			{#snippet lede()}<p>{summary('estados')}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[{ kind: 'mapa', metrics: rated, top: 27 }]}
				{source}
				{labels}
				slug="acidentes-estados"
			/>
		</StorySection>

		<StorySection id="municipios" icon="map" title="Municípios">
			{#snippet lede()}<p>{summary('municipios')}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[{ kind: 'municipios', metrics: causes }]}
				{source}
				{labels}
				slug="acidentes-municipios"
			/>
		</StorySection>

		<StorySection id="atividades" icon="factory" title="Em que trabalho o risco se concentra">
			{#snippet lede()}<p>{summary('atividades')}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[
					{ kind: 'dim', dim: 'atividade', metrics: rated },
					{ kind: 'dim', dim: 'ocupacao', metrics: causes },
					{
						kind: 'extra',
						key: 'familia',
						title: 'Família ocupacional',
						metrics: [accidents, deaths],
						top: 15
					}
				]}
				{source}
				{labels}
				slug="acidentes-atividades"
			/>
			<ScopeNote ignored={active} />
			<ClassesCnae year={data.accidents.year} sectors={data.sectors} {source} />
		</StorySection>

		<StorySection id="perfil" icon="users" title="Quem se acidenta">
			{#snippet lede()}<p>{summary('perfil')}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[
					{ kind: 'dim', dim: 'sexo', metrics: causes },
					{ kind: 'dim', dim: 'idade', metrics: causes }
				]}
				{source}
				{labels}
				slug="acidentes-perfil"
			/>
		</StorySection>

		<StorySection id="como-acontece" icon="triangle-alert" title="Como acontece">
			{#snippet lede()}<p>{summary('como-acontece')}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[
					{ kind: 'dim', dim: 'agente', metrics: causes, top: 15 },
					{ kind: 'dim', dim: 'lesao', metrics: causes, top: 15 },
					{ kind: 'dim', dim: 'parte', metrics: causes, top: 15 },
					{
						kind: 'extra',
						key: 'cid',
						title: 'Capítulo da CID-10',
						metrics: [accidents, deaths],
						top: 12
					}
				]}
				{source}
				{labels}
				slug="acidentes-causas"
			/>
		</StorySection>

		<StorySection id="quando" icon="activity" title="Quando acontece">
			{#snippet lede()}<p>{summary('quando')}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[
					{
						kind: 'extra',
						key: 'mes',
						title: 'Mês',
						order: MONTHS.map((_, index) => String(index + 1)),
						metrics: causes
					},
					{
						kind: 'extra',
						key: 'dia',
						title: 'Dia da semana',
						order: ['2', '3', '4', '5', '6', '7', '1'],
						metrics: causes
					}
				]}
				{source}
				{labels}
				slug="acidentes-quando"
			/>
		</StorySection>

		<StorySection id="adolescentes" icon="user" title="Adolescentes no trabalho">
			{#snippet lede()}<p>{summary('adolescentes')}</p>{/snippet}
			<CubePanels
				view={data.adolescents}
				metric={accidents}
				parts={[
					{ kind: 'serie', metrics: [accidents, deaths] },
					{ kind: 'dim', dim: 'atividade', metrics: [accidents, deaths] },
					{ kind: 'mapa', metrics: [accidents, deaths] },
					{ kind: 'dim', dim: 'agente', metrics: [accidents, deaths], top: 12 },
					{ kind: 'dim', dim: 'lesao', metrics: [accidents, deaths], top: 12 }
				]}
				{source}
				{labels}
				slug="acidentes-adolescentes"
			/>
		</StorySection>

		<StorySection id="beneficios" icon="wallet" title="O que o INSS paga depois do acidente">
			{#snippet lede()}<p>{summary('beneficios')}</p>{/snippet}
			<CubePanels
				view={data.benefits}
				metric={grants}
				parts={[
					{ kind: 'serie', metrics: grantMetrics },
					{
						kind: 'extra',
						key: 'especie',
						title: 'Espécie do benefício',
						metrics: [grants, spending]
					},
					{ kind: 'mensal', metrics: [grants, spending] },
					{
						kind: 'mapa',
						metrics: data.benefits.rated
							? [grantRate, grants, leaveDays, spending]
							: [grants, leaveDays, spending]
					},
					{
						kind: 'extra',
						key: 'grupo',
						title: 'Grupo de diagnóstico',
						metrics: [grants, leaveDays]
					},
					{
						kind: 'extra',
						key: 'cid',
						title: 'Diagnóstico (CID-10)',
						metrics: [grants, leaveDays, spending],
						top: 20
					},
					{ kind: 'dim', dim: 'sexo', metrics: [grants, leaveDays] },
					{ kind: 'dim', dim: 'idade', metrics: [grants, leaveDays] },
					{ kind: 'dim', dim: 'atividade', metrics: [grants, leaveDays, spending] }
				]}
				source={inssSource}
				labels={benefitLabels}
				slug="beneficios-acidentarios"
			/>
			{#await data.benefitsHistory}
				<p class="pending pending-tall">Carregando a série mensal…</p>
			{:then benefits}
				<Beneficios {benefits} />
			{:catch}
				<p class="pending">Não foi possível carregar a série mensal. Recarregue a página.</p>
			{/await}
		</StorySection>

		<StorySection
			id="raca-escolaridade"
			icon="users"
			title="Raça, escolaridade e o acidente sem CAT"
		>
			{#snippet lede()}<p>{summary('raca-escolaridade')}</p>{/snippet}
			<ScopeNote
				ignored={active.filter((key) => !socialDims.includes(key))}
				requestedYear={filters.year}
				fixedPeriod="o anuário estatístico de {data.social.year}"
			/>
			<Desigualdade data={data.social} />
		</StorySection>

		<StorySection id="caminhoneiros" icon="truck" title="Caminhoneiros nas rodovias federais">
			{#snippet lede()}<p>{summary('caminhoneiros')}</p>{/snippet}
			<CubePanels
				view={data.truckers}
				metric={truckDeaths}
				parts={[
					{ kind: 'serie', metrics: [truckDeaths, truckDrivers] },
					{ kind: 'mapa', metrics: [truckDeaths, truckDrivers] },
					{ kind: 'dim', dim: 'idade', metrics: [truckDeaths, truckDrivers] },
					{ kind: 'dim', dim: 'sexo', metrics: [truckDrivers, truckDeaths] }
				]}
				source={truckSource}
				slug="caminhoneiros"
			/>
			<Caminhoneiros data={data.highways} />
		</StorySection>
	</div>
</GroupPage>

<style>
	.pending {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.pending-tall {
		min-block-size: 40rem;
	}
</style>
