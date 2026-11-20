<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import KpiCard from '#lib/components/KpiCard.svelte';
	import { globalSearch, readFilters } from '#lib/filters.ts';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import type { CubeView } from '#lib/server/catalog/cubos.ts';
	import { yearStatusLabel } from '#lib/status.ts';
	import { GROUPS, groupPath } from '#lib/topics.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const uf = $derived(readFilters(page.url.searchParams).selection.uf ?? null);
	const place = $derived(uf?.label ?? 'Brasil');
	const search = $derived(globalSearch(page.url));

	const current = (view: CubeView) => view.years.find((row) => row.year === view.year) ?? null;
	const value = (view: CubeView, key: string) => current(view)?.values[key] ?? null;
	const context = (view: CubeView) =>
		`${view.year}${view.status === 'consolidado' ? '' : ` (${yearStatusLabel[view.status].toLocaleLowerCase('pt-BR')})`}, ${place}`;

	const accidents = $derived(current(data.accidents));
	const rate = $derived(
		accidents?.jobs ? ((accidents.values.acidentes_base ?? 0) * 100_000) / accidents.jobs : null
	);
	const updated = $derived(data.register.updatedAt.split('-').toReversed().join('/'));

	/** One figure per group card, from the same reads as the key numbers. */
	const highlights = $derived({
		acidentes: `${formatInteger(value(data.accidents, 'acidentes'))} acidentes com CAT em ${data.accidents.year}`,
		'saude-do-trabalhador': `${formatInteger(value(data.notifications, 'notificacoes'))} notificações no SUS em ${data.notifications.year}`,
		'trabalho-e-informalidade': `${formatInteger(data.register.workers)} trabalhadores no cadastro de trabalho escravo de ${updated}`,
		internacional: 'Comparações com a União Europeia, os Estados Unidos e os países da OIT'
	});
</script>

<svelte:head>
	<title>Observatório SST — saúde e segurança no trabalho no Brasil</title>
	<meta
		name="description"
		content="Acidentes de trabalho, adoecimento, informalidade e comparações internacionais, com dados públicos por estado, atividade, ocupação, sexo, idade e raça/cor."
	/>
</svelte:head>

<div class="l-stack home">
	<header class="l-stack intro">
		<h1>Saúde e segurança no trabalho</h1>
		<p class="scope">
			{uf ? uf.label : 'Brasil'}, com os dados públicos mais recentes de cada fonte
		</p>
		<p class="lede">
			Dados públicos sobre acidentes, adoecimento e condições de trabalho, reunidos em quatro grupos
			de análises. Cada página filtra por ano, estado, sexo, idade, raça/cor, atividade e ocupação,
			onde a fonte permite.
		</p>
	</header>

	<section class="l-stack" aria-labelledby="numeros">
		<h2 id="numeros">Números-chave{uf ? ` de ${uf.label}` : ''}</h2>
		<div class="kpis">
			<KpiCard
				label="Acidentes com CAT"
				icon="triangle-alert"
				value={value(data.accidents, 'acidentes')}
				format={formatInteger}
				context={context(data.accidents)}
			/>
			<KpiCard
				label="Taxa de acidentes"
				icon="activity"
				value={rate}
				format={(number) => formatDecimal(number)}
				unit="por 100 mil vínculos"
				context={context(data.accidents)}
			/>
			<KpiCard
				label="Óbitos com CAT"
				icon="file"
				value={value(data.accidents, 'obitos')}
				format={formatInteger}
				context={context(data.accidents)}
			/>
			<KpiCard
				label="Afastamentos por transtorno mental"
				icon="heart-pulse"
				value={value(data.mental, 'concessoes')}
				format={formatInteger}
				context={context(data.mental)}
			/>
			<KpiCard
				label="Notificações no SUS"
				icon="activity"
				value={value(data.notifications, 'notificacoes')}
				format={formatInteger}
				context={context(data.notifications)}
			/>
			<KpiCard
				label="Mortes no trabalho no SUS"
				icon="file"
				value={value(data.deaths, 'obitos')}
				format={formatInteger}
				context={context(data.deaths)}
			/>
		</div>
		<p class="hint">
			Cada número é do último ano fechado da sua fonte. A taxa divide os acidentes pelos vínculos
			formais sem administração pública; a <a href={resolve('/(institucional)/metodologia')}
				>metodologia</a
			> explica cada medida.
		</p>
	</section>

	<section class="l-stack" aria-labelledby="grupos">
		<h2 id="grupos">Análises</h2>
		<ul class="groups">
			{#each GROUPS as group (group.slug)}
				<li class="card">
					<h3>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved by groupPath -->
						<a class="open" href="{groupPath(group.slug)}{search}"
							><span class="mark"><Icon name={group.icon} /></span>{group.title}</a
						>
					</h3>
					<p class="figure">{highlights[group.slug]}</p>
					<p class="summary">{group.summary}</p>
					<ul class="sections">
						{#each group.sections as section (section.id)}
							<li>
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved by groupPath -->
								<a href="{groupPath(group.slug)}{search}#{section.id}">{section.title}</a>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.home {
		--stack-gap: var(--space-7);
	}

	.intro,
	section {
		--stack-gap: var(--space-4);
	}

	.scope {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.lede {
		max-inline-size: var(--measure);
		color: var(--ink-2);
		font-size: var(--text-lg);
	}

	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
		grid-template-rows: repeat(3, auto);
		gap: var(--space-1) var(--space-5);
	}

	.hint {
		max-inline-size: var(--measure);
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.groups {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
		gap: var(--space-5);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-block-start: var(--space-4);
		border-block-start: 1px solid var(--ink);
	}

	.open {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		text-decoration: none;
	}

	.open:hover {
		text-decoration: underline;
	}

	.mark {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border: var(--border);
		border-radius: var(--radius);
		color: var(--ink-2);
	}

	.figure {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
	}

	.summary {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.sections {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	.sections a {
		color: var(--ink-2);
	}

	.sections a:hover {
		color: var(--ink);
	}
</style>
