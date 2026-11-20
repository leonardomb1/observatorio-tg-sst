<script lang="ts">
	import { page } from '$app/state';
	import GroupPage from '#lib/components/grupo/GroupPage.svelte';
	import ScopeNote from '#lib/components/grupo/ScopeNote.svelte';
	import StorySection from '#lib/components/StorySection.svelte';
	import { readFilters, type Dimension } from '#lib/filters.ts';
	import { findGroup } from '#lib/topics.ts';
	import EstadosUnidos from './EstadosUnidos.svelte';
	import Europa from './Europa.svelte';
	import Oit from './Oit.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const group = findGroup('internacional');
	const summary = (id: string) => group.sections.find((each) => each.id === id)?.summary;
	const active = $derived(Object.keys(readFilters(page.url.searchParams).selection) as Dimension[]);
</script>

<GroupPage {group} years={[]}>
	<ScopeNote ignored={active} />

	<StorySection id="europa" icon="globe" title="Brasil e União Europeia">
		{#snippet lede()}<p>{summary('europa')}</p>{/snippet}
		<Europa data={data.europe} />
	</StorySection>

	<StorySection id="estados-unidos" icon="globe" title="Estados Unidos">
		{#snippet lede()}<p>{summary('estados-unidos')}</p>{/snippet}
		<EstadosUnidos years={data.usa} />
	</StorySection>

	<StorySection id="oit" icon="globe" title="O Brasil entre os países da OIT">
		{#snippet lede()}<p>{summary('oit')}</p>{/snippet}
		<Oit data={data.world} />
	</StorySection>
</GroupPage>
