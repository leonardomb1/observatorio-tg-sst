<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import CubePanels from '#lib/components/grupo/CubePanels.svelte';
	import GroupPage from '#lib/components/grupo/GroupPage.svelte';
	import ScopeNote from '#lib/components/grupo/ScopeNote.svelte';
	import StorySection from '#lib/components/StorySection.svelte';
	import { readFilters, type Dimension } from '#lib/filters.ts';
	import { count, perJobs, perThousand } from '#lib/metrics.ts';
	import { catSource, topicSource } from '#lib/sources.ts';
	import { findGroup } from '#lib/topics.ts';
	import Beneficios from './Beneficios.svelte';
	import Caminhoneiros from './Caminhoneiros.svelte';
	import ComoAcontece from './ComoAcontece.svelte';
	import Desigualdade from './Desigualdade.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const group = findGroup('acidentes');
	const section = (id: string) => {
		const found = group.sections.find((each) => each.id === id);
		if (!found) throw new Error(`Seção desconhecida: ${id}`);
		return found;
	};

	const filters = $derived(readFilters(page.url.searchParams));
	const active = $derived(Object.keys(filters.selection) as Dimension[]);
	const ignoredBy = (dims: readonly Dimension[]) => active.filter((key) => !dims.includes(key));

	const source = $derived(catSource(data.calendar.publishedUntil));
	const BASE = 'por 100 mil vínculos formais, sem administração pública';
	const accidents = count('acidentes', 'Acidentes', 'acidentes', 'Acidentes com CAT');
	const deaths = count('obitos', 'Óbitos', 'óbitos', 'Óbitos com CAT');
	const accidentRate = $derived(
		data.accidents.rated
			? perJobs('acidentes_base', 'Acidentes por 100 mil', 'acidentes', `Acidentes com CAT ${BASE}`)
			: accidents
	);
	const deathRate = $derived(
		data.accidents.rated
			? perJobs('obitos_base', 'Óbitos por 100 mil', 'óbitos', `Óbitos com CAT ${BASE}`, 2)
			: deaths
	);
	const lethality = perThousand(
		'obitos',
		'acidentes',
		'Óbitos por mil acidentes',
		'óbitos',
		'Óbitos por mil acidentes com CAT'
	);

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

	const READER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
	const SETTLE_MS = 1000;

	/**
	 * Streamed sections grow the page after the jump to an anchor and push the
	 * target down. While they arrive, every resize pins the target back in place;
	 * pinning stops once they are in, or as soon as the reader scrolls, taps or types.
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
		const streamed = untrack(() => [data.causes, data.benefits]);
		void Promise.allSettled(streamed).then(() => {
			timer = setTimeout(release, SETTLE_MS);
		});
		return release;
	};
</script>

<GroupPage {group} years={data.years}>
	<div {@attach keepAnchor}>
		<StorySection id="visao-geral" icon="chart" title="Visão geral">
			{#snippet lede()}<p>{section('visao-geral').summary}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[
					{ kind: 'serie' },
					{ kind: 'serie', metric: data.accidents.rated ? accidentRate : deaths },
					{ kind: 'extra', key: 'tipo', title: 'Tipo de acidente' },
					{ kind: 'extra', key: 'tipo', title: 'Tipo de acidente', metric: lethality }
				]}
				{source}
				slug="acidentes"
			/>
		</StorySection>

		<StorySection id="estados" icon="map" title="Onde o risco é maior">
			{#snippet lede()}<p>{section('estados').summary}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidentRate}
				parts={[{ kind: 'mapa' }, { kind: 'dim', dim: 'uf', metric: deathRate }]}
				{source}
				slug="acidentes-estados"
			/>
		</StorySection>

		<StorySection id="atividades" icon="factory" title="Em que trabalho o risco se concentra">
			{#snippet lede()}<p>{section('atividades').summary}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidentRate}
				parts={[
					{ kind: 'dim', dim: 'atividade' },
					{ kind: 'dim', dim: 'atividade', metric: deathRate },
					{ kind: 'dim', dim: 'ocupacao', metric: accidents },
					{ kind: 'dim', dim: 'ocupacao', metric: deaths }
				]}
				{source}
				slug="acidentes-atividades"
			/>
		</StorySection>

		<StorySection id="perfil" icon="users" title="Quem se acidenta">
			{#snippet lede()}<p>{section('perfil').summary}</p>{/snippet}
			<CubePanels
				view={data.accidents}
				metric={accidents}
				parts={[
					{ kind: 'dim', dim: 'sexo' },
					{ kind: 'dim', dim: 'idade' },
					{ kind: 'dim', dim: 'sexo', metric: deaths },
					{ kind: 'dim', dim: 'idade', metric: deaths }
				]}
				{source}
				slug="acidentes-perfil"
			/>
		</StorySection>

		<StorySection
			id="como-acontece"
			icon="triangle-alert"
			title="O que causa os acidentes que matam"
		>
			{#snippet lede()}<p>{section('como-acontece').summary}</p>{/snippet}
			<ScopeNote
				ignored={active}
				requestedYear={filters.year}
				fixedPeriod="os óbitos de {data.calendar.lastConsolidated}, o último ano consolidado"
			/>
			{#await data.causes}
				<p class="pending pending-tall">Carregando a seção…</p>
			{:then causes}
				<ComoAcontece calendar={data.calendar} {causes} />
			{:catch}
				<p class="pending">Não foi possível carregar esta seção. Recarregue a página.</p>
			{/await}
		</StorySection>

		<StorySection id="beneficios" icon="wallet" title="O que o INSS paga depois do acidente">
			{#snippet lede()}<p>{section('beneficios').summary}</p>{/snippet}
			<ScopeNote
				ignored={active}
				requestedYear={filters.year}
				fixedPeriod="todos os anos publicados"
			/>
			{#await data.benefits}
				<p class="pending pending-tall">Carregando a seção…</p>
			{:then benefits}
				<Beneficios {benefits} />
			{:catch}
				<p class="pending">Não foi possível carregar esta seção. Recarregue a página.</p>
			{/await}
		</StorySection>

		<StorySection
			id="raca-escolaridade"
			icon="users"
			title="Raça, escolaridade e o acidente sem CAT"
		>
			{#snippet lede()}<p>{section('raca-escolaridade').summary}</p>{/snippet}
			<ScopeNote
				ignored={ignoredBy(section('raca-escolaridade').dims)}
				requestedYear={filters.year}
				fixedPeriod="o anuário estatístico de {data.social.year}"
			/>
			<Desigualdade data={data.social} />
		</StorySection>

		<StorySection id="caminhoneiros" icon="truck" title="Caminhoneiros nas rodovias federais">
			{#snippet lede()}<p>{section('caminhoneiros').summary}</p>{/snippet}
			<CubePanels
				view={data.truckers}
				metric={truckDeaths}
				parts={[
					{ kind: 'serie' },
					{ kind: 'serie', metric: truckDrivers },
					{ kind: 'mapa' },
					{ kind: 'dim', dim: 'idade' },
					{ kind: 'dim', dim: 'sexo', metric: truckDrivers }
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
		min-block-size: 60rem;
	}
</style>
