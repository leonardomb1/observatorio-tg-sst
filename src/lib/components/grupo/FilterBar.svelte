<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Combobox from '#lib/components/Combobox.svelte';
	import {
		DIMENSIONS,
		readFilters,
		withParams,
		type Dimension,
		type Option
	} from '#lib/filters.ts';
	import Icon from '../Icon.svelte';

	interface Props {
		/** Dimensions some section of the page can filter by. */
		dims: readonly Dimension[];
		/** Years any section has, newest first. */
		years: readonly number[];
		/** Options of the long lists loaded from the datamart; a dimension without any is hidden. */
		options?: Partial<Record<Dimension, readonly Option[]>>;
	}

	let { dims, years, options = {} }: Props = $props();

	const choices = (dim: Dimension) => options[dim] ?? DIMENSIONS[dim].options;
	const shown = $derived(dims.filter((dim) => choices(dim).length > 0));

	const filters = $derived(readFilters(page.url.searchParams));
	const active = $derived(Object.keys(filters.selection).length > 0 || filters.year !== null);

	/** A new state drops the municipality, which belongs to the previous one. */
	function set(key: string, value: string | null) {
		const changes = key === 'uf' ? { uf: value, municipio: null } : { [key]: value };
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- same page, only the search changes
		void goto(withParams(page.url, changes), { replace: true, reset: false });
	}

	const cleared = $derived(
		withParams(page.url, Object.fromEntries(['ano', ...dims].map((key) => [key, null])))
	);
</script>

<form
	class="filters"
	aria-label="Filtros da página"
	onsubmit={(event) => {
		event.preventDefault();
	}}
>
	<div class="field">
		<Combobox
			label="Ano"
			placeholder="Mais recente"
			options={years.map((year) => ({ value: String(year), label: String(year) }))}
			value={filters.year === null ? null : String(filters.year)}
			onchange={(value) => {
				set('ano', value);
			}}
		/>
	</div>
	{#each shown as dim (dim)}
		<div class="field">
			<Combobox
				label={DIMENSIONS[dim].label}
				placeholder={dim === 'uf' ? 'Brasil' : 'Todos'}
				options={choices(dim).map((option) => ({
					value: option.slug,
					label: option.label,
					...(dim === 'atividade' || dim === 'ocupacao' ? { hint: option.value } : {})
				}))}
				value={filters.selection[dim]?.slug ?? null}
				onchange={(value) => {
					set(dim, value);
				}}
			/>
		</div>
	{/each}
	{#if active}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built from the current URL -->
		<a class="clear" href={cleared} data-sveltekit-reset="false" data-sveltekit-replacestate
			><Icon name="x" />Limpar filtros</a
		>
	{/if}
</form>

<style>
	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(9rem, 100%), 1fr));
		gap: var(--space-3) var(--space-4);
		align-items: end;
		padding-block: var(--space-4);
		border-block: var(--border);
	}

	.field,
	.field :global(.combobox) {
		min-inline-size: 0;
	}

	.clear {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		align-self: center;
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.clear:hover {
		color: var(--ink);
	}
</style>
