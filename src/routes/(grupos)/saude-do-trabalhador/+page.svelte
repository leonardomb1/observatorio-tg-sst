<script lang="ts">
	import CubePanels from '#lib/components/grupo/CubePanels.svelte';
	import GroupPage from '#lib/components/grupo/GroupPage.svelte';
	import StorySection from '#lib/components/StorySection.svelte';
	import { count, share } from '#lib/metrics.ts';
	import type { CubeView } from '#lib/server/catalog/cubos.ts';
	import { topicSource } from '#lib/sources.ts';
	import { findGroup } from '#lib/topics.ts';
	import MortesNoSus from './MortesNoSus.svelte';
	import NotificacoesSus from './NotificacoesSus.svelte';
	import SaudeMental from './SaudeMental.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const group = findGroup('saude-do-trabalhador');
	const summary = (id: string) => group.sections.find((each) => each.id === id)?.summary;
	const span = (view: CubeView) =>
		`${view.years[0]?.year ?? '—'} a ${view.years.at(-1)?.year ?? '—'}`;

	const leaves = count(
		'concessoes',
		'Afastamentos',
		'afastamentos',
		'Auxílios por incapacidade temporária concedidos por transtorno mental (CID-10, capítulo F)'
	);
	const recognised = share(
		'acidentarias',
		'concessoes',
		'Parcela acidentária',
		'afastamentos',
		'Afastamentos por transtorno mental concedidos como acidentários (B91), em % do total'
	);
	const notifications = count(
		'notificacoes',
		'Notificações',
		'notificações',
		'Notificações de agravos de saúde do trabalhador no SINAN'
	);
	const withCat = share(
		'com_cat',
		'cat_informada',
		'Com CAT',
		'notificações',
		'Notificações com CAT emitida, em % das que informam o campo'
	);
	const simDeaths = count(
		'obitos',
		'Óbitos',
		'óbitos',
		'Óbitos com o campo acidente de trabalho marcado no SIM'
	);
</script>

<GroupPage {group} years={data.years}>
	<StorySection id="saude-mental" icon="heart-pulse" title="Saúde mental">
		{#snippet lede()}<p>{summary('saude-mental')}</p>{/snippet}
		<CubePanels
			view={data.mental}
			metric={leaves}
			parts={[
				{ kind: 'serie', metrics: [leaves, recognised] },
				{ kind: 'extra', key: 'cid', title: 'Diagnóstico (CID-10)', metrics: [leaves, recognised] },
				{ kind: 'mapa', metrics: [leaves, recognised] },
				{ kind: 'dim', dim: 'sexo', metrics: [leaves, recognised] }
			]}
			source={topicSource('incapacidade', `concessões de ${span(data.mental)}`)}
			labels={{ cid: data.cidNames }}
			slug="afastamentos-mentais"
		/>
		<SaudeMental data={data.mentalHealth} />
	</StorySection>

	<StorySection id="notificacoes-sus" icon="activity" title="Notificações no SUS">
		{#snippet lede()}<p>{summary('notificacoes-sus')}</p>{/snippet}
		<CubePanels
			view={data.notifications}
			metric={notifications}
			parts={[
				{ kind: 'serie', metrics: [notifications, withCat] },
				{ kind: 'dim', dim: 'agravo', metrics: [notifications, withCat] },
				{ kind: 'mapa', metrics: [notifications, withCat] },
				{
					kind: 'extra',
					key: 'situacao',
					title: 'Situação no trabalho',
					metrics: [notifications, withCat]
				},
				{ kind: 'dim', dim: 'sexo' },
				{ kind: 'dim', dim: 'idade' },
				{ kind: 'dim', dim: 'raca' },
				{ kind: 'dim', dim: 'ocupacao' }
			]}
			source={topicSource('sinan', `notificações de ${span(data.notifications)}`)}
			slug="notificacoes-sinan"
		/>
		<NotificacoesSus data={data.sinan} />
	</StorySection>

	<StorySection id="mortes-no-sus" icon="file" title="Mortes no SUS">
		{#snippet lede()}<p>{summary('mortes-no-sus')}</p>{/snippet}
		<CubePanels
			view={data.deaths}
			metric={simDeaths}
			parts={[
				{ kind: 'serie' },
				{ kind: 'extra', key: 'causa', title: 'Causa básica' },
				{ kind: 'mapa' },
				{ kind: 'dim', dim: 'sexo' },
				{ kind: 'dim', dim: 'idade' },
				{ kind: 'dim', dim: 'raca' },
				{ kind: 'dim', dim: 'ocupacao' }
			]}
			source={topicSource('sim', `óbitos de ${span(data.deaths)}`)}
			slug="obitos-trabalho-sim"
		/>
		<MortesNoSus data={data.sim} />
	</StorySection>
</GroupPage>
