<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import Choices from '#lib/components/Choices.svelte';
	import type { YearStatus } from '#lib/status.ts';

	interface Props {
		/** Section the links return to, so the permalink opens on the same view. */
		section: string;
		year: number;
		metric: 'acidentes' | 'obitos';
		years: readonly { year: number; status: YearStatus }[];
	}

	let { section, year, metric, years }: Props = $props();

	function href(key: string, value: string) {
		const params = new SvelteURLSearchParams(page.url.search);
		params.set(key, value);
		return `${resolve('/(historia)')}?${params.toString()}#${section}`;
	}
</script>

<div class="l-stack filters">
	<Choices
		label="Ano"
		current={String(year)}
		choices={years.map((row) => ({
			value: String(row.year),
			label: String(row.year),
			status: row.status,
			href: href('ano', String(row.year))
		}))}
	/>
	<Choices
		label="Medida"
		current={metric}
		choices={[
			{ value: 'acidentes', label: 'Acidentes', href: href('medida', 'acidentes') },
			{ value: 'obitos', label: 'Óbitos', href: href('medida', 'obitos') }
		]}
	/>
	<p class="hint">Ano e medida valem para os estados e para as atividades.</p>
</div>

<style>
	.filters {
		--stack-gap: var(--space-3);
	}

	.hint {
		color: var(--ink-2);
		font-size: var(--text-xs);
	}
</style>
