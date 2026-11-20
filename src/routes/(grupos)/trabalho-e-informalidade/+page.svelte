<script lang="ts">
	import { page } from '$app/state';
	import CubePanels from '#lib/components/grupo/CubePanels.svelte';
	import GroupPage from '#lib/components/grupo/GroupPage.svelte';
	import ScopeNote from '#lib/components/grupo/ScopeNote.svelte';
	import StorySection from '#lib/components/StorySection.svelte';
	import { readFilters, type Dimension } from '#lib/filters.ts';
	import { formatDecimal } from '#lib/format.ts';
	import { count, type Metric } from '#lib/metrics.ts';
	import { topicSource } from '#lib/sources.ts';
	import { findGroup } from '#lib/topics.ts';
	import Informalidade from './Informalidade.svelte';
	import Rotatividade from './Rotatividade.svelte';
	import TrabalhoEscravo from './TrabalhoEscravo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const group = findGroup('trabalho-e-informalidade');
	const summary = (id: string) => group.sections.find((each) => each.id === id)?.summary;
	const filters = $derived(readFilters(page.url.searchParams));
	const active = $derived(Object.keys(filters.selection) as Dimension[]);

	/** Turnover as the lesser of hires and separations over the year-end stock of formal jobs. */
	const turnover: Metric = {
		noun: 'vínculos',
		label: 'Rotatividade (%)',
		unit: 'Menor entre admissões e desligamentos do CAGED, em % dos vínculos ativos da RAIS em 31/12',
		value: (slice) => {
			const hires = slice.values.admissoes;
			const exits = slice.values.desligamentos;
			const jobs = slice.values.vinculos;
			return hires == null || exits == null || !jobs ? null : (Math.min(hires, exits) * 100) / jobs;
		},
		format: (value) => formatDecimal(value),
		additive: false
	};
	const hires = count('admissoes', 'Admissões', 'admissões', 'Admissões no Novo CAGED');
	const workers = count(
		'trabalhadores',
		'Trabalhadores',
		'trabalhadores',
		'Trabalhadores envolvidos nas ações fiscais, pelo ano da ação, no cadastro vigente'
	);
	const employers = count(
		'empregadores',
		'Empregadores',
		'empregadores',
		'Empregadores do cadastro vigente, pelo ano da ação fiscal'
	);
	const updated = $derived(data.register.updatedAt.split('-').toReversed().join('/'));
</script>

<GroupPage {group} years={data.years}>
	<StorySection id="informalidade" icon="briefcase" title="Informalidade">
		{#snippet lede()}<p>{summary('informalidade')}</p>{/snippet}
		<ScopeNote
			ignored={active.filter((key) => key !== 'uf')}
			requestedYear={filters.year}
			fixedPeriod="o último ano com PNAD e RAIS, {data.informality
				.year}, e a série trimestral da PNAD"
		/>
		<Informalidade data={data.informality} uf={filters.selection.uf?.value ?? null} />
	</StorySection>

	<StorySection id="rotatividade" icon="repeat" title="Rotatividade">
		{#snippet lede()}<p>{summary('rotatividade')}</p>{/snippet}
		<CubePanels
			view={data.turnoverView}
			metric={turnover}
			parts={[
				{ kind: 'serie' },
				{ kind: 'serie', metric: hires },
				{ kind: 'mapa' },
				{ kind: 'dim', dim: 'atividade' }
			]}
			source={topicSource(
				'caged',
				`${data.turnoverView.years[0]?.year ?? '—'} a ${data.turnoverView.years.at(-1)?.year ?? '—'}`
			)}
			slug="rotatividade"
		/>
		<Rotatividade data={data.turnover} />
	</StorySection>

	<StorySection id="trabalho-escravo" icon="link" title="Trabalho escravo">
		{#snippet lede()}<p>{summary('trabalho-escravo')}</p>{/snippet}
		<TrabalhoEscravo data={data.register} />
		<CubePanels
			view={data.slaveView}
			metric={workers}
			parts={[
				{ kind: 'serie' },
				{ kind: 'serie', metric: employers },
				{ kind: 'mapa' },
				{ kind: 'dim', dim: 'atividade' }
			]}
			source={topicSource('escravidao', `edição atualizada em ${updated}`)}
			slug="trabalho-escravo"
		/>
	</StorySection>
</GroupPage>
