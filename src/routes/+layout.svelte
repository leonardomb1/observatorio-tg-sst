<script lang="ts">
	import '@fontsource-variable/source-serif-4';
	import '@fontsource-variable/source-sans-3';
	import '#lib/styles/app.css';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { CONTACT_EMAIL } from '#lib/contact.ts';
	import Combobox from '#lib/components/Combobox.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { setToaster, Toaster } from '#lib/components/toast.svelte.ts';
	import { DIMENSIONS, globalSearch, readFilters, withParams } from '#lib/filters.ts';
	import { GROUPS, groupPath } from '#lib/topics.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	setToaster(new Toaster());

	const links = $derived([
		{
			href: resolve('/(historia)'),
			route: '/(historia)',
			label: 'Visão geral',
			icon: 'chart' as IconName
		},
		...GROUPS.map((group) => ({
			href: groupPath(group.slug),
			route: `/(grupos)/${group.slug}`,
			label: group.title,
			icon: group.icon
		}))
	]);

	const search = $derived(globalSearch(page.url));
	const uf = $derived(readFilters(page.url.searchParams).selection.uf ?? null);

	function chooseUf(slug: string | null) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- same page, only the search changes
		void goto(withParams(page.url, { uf: slug }), { replace: true, reset: false });
	}
</script>

<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>

<header class="site-header">
	<div class="l-page header-inner">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved path plus the site-wide state -->
		<a class="brand" href="{resolve('/(historia)')}{search}">Observatório SST</a>
		<nav aria-label="Grupos de análises">
			<ul class="sections">
				{#each links as link (link.route)}
					<li>
						<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved path plus the site-wide state -->
						<a
							href="{link.href}{search}"
							aria-current={page.route.id === link.route ? 'page' : undefined}
							><Icon name={link.icon} />{link.label}</a
						>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</li>
				{/each}
			</ul>
		</nav>
		<div class="place">
			<Combobox
				label="Estado"
				placeholder="Brasil"
				options={DIMENSIONS.uf.options.map((option) => ({
					value: option.slug,
					label: option.label
				}))}
				value={uf?.slug ?? null}
				onchange={chooseUf}
			/>
		</div>
		<a
			class="ask"
			href={resolve('/consulta')}
			aria-current={page.route.id?.startsWith('/consulta') ? 'page' : undefined}
			><Icon name="message-square-text" />Consulta</a
		>
	</div>
</header>

<main id="conteudo" class="l-page">
	{@render children()}
</main>

{#if !page.route.id?.startsWith('/consulta')}
	<footer class="site-footer">
		<div class="l-page footer-inner">
			<p class="credit">
				<a href={resolve('/(institucional)/sobre')}>Observatório SST</a>, Trabalho de Graduação da
				Fatec Indaiatuba
			</p>
			<nav aria-label="Institucional">
				<ul class="links">
					<li><a href={resolve('/(institucional)/sobre')}>Sobre</a></li>
					<li><a href={resolve('/(institucional)/fontes')}>Fontes e dados</a></li>
					<li><a href={resolve('/(institucional)/ia')}>Inteligência artificial</a></li>
					<li><a href={resolve('/(institucional)/privacidade')}>Privacidade</a></li>
					<li><a href={resolve('/(institucional)/termos')}>Termos de uso</a></li>
					<li><a href="mailto:{CONTACT_EMAIL}">Contato</a></li>
				</ul>
			</nav>
			<p class="note">
				A consulta usa inteligência artificial e pode errar: confira os dados e as fontes de cada
				resposta.
			</p>
		</div>
	</footer>
{/if}

<Toasts />

<style>
	.skip-link {
		position: absolute;
		z-index: 2;
		inset-block-start: var(--space-2);
		inset-inline-start: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--surface);
		border: var(--border);
		transform: translateY(-200%);
	}

	.skip-link:focus-visible {
		transform: none;
	}

	.site-header {
		position: sticky;
		z-index: 1;
		inset-block-start: 0;
		border-block-end: var(--border);
		padding-block: var(--space-3);
		background: var(--paper);
	}

	.header-inner {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: center;
	}

	.brand {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
		text-decoration: none;
	}

	nav {
		flex-basis: 100%;
		order: 1;
		min-inline-size: 0;
		max-inline-size: 100%;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.sections {
		display: flex;
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
		white-space: nowrap;
	}

	.sections a {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		padding-block: var(--space-1);
		color: var(--ink-2);
		text-decoration: underline;
		text-decoration-color: transparent;
		text-decoration-thickness: 2px;
		text-underline-offset: 0.35em;
	}

	@media (prefers-reduced-motion: no-preference) {
		.sections a {
			transition: text-decoration-color 200ms var(--ease-out);
		}
	}

	.sections a:hover {
		color: var(--ink);
	}

	.sections a[aria-current] {
		color: var(--ink);
		text-decoration-color: var(--ink);
	}

	.place {
		flex: 0 1 11rem;
		min-inline-size: 7rem;
		margin-inline-start: auto;
		font-size: var(--text-sm);
	}

	.place :global(.combobox) {
		min-inline-size: 0;
	}

	.place :global(label) {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.place :global(input) {
		padding-block: var(--space-1);
	}

	.ask {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		font-size: var(--text-sm);
		text-decoration: none;
		white-space: nowrap;
	}

	.ask:hover,
	.ask[aria-current] {
		border-color: var(--ink);
	}

	main {
		padding-block: var(--space-7);
	}

	.site-footer {
		border-block-start: var(--border);
		padding-block: var(--space-5) var(--space-6);
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.footer-inner {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-6);
		align-items: baseline;
		justify-content: space-between;
	}

	.site-footer .credit a {
		color: var(--ink);
		font-family: var(--font-serif);
		font-weight: 600;
		text-decoration: none;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.site-footer .links a {
		color: var(--ink-2);
	}

	.site-footer .links a:hover {
		color: var(--ink);
	}

	.note {
		flex-basis: 100%;
		color: var(--ink-3);
		font-size: var(--text-xs);
	}
</style>
