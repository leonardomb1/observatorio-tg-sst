<script lang="ts">
	import '@fontsource-variable/source-serif-4';
	import '@fontsource-variable/source-sans-3';
	import '#lib/styles/app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Toasts from '#lib/components/Toasts.svelte';
	import { setToaster, Toaster } from '#lib/components/toast.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	setToaster(new Toaster());

	const sections = [
		{ href: resolve('/'), label: 'Visão geral' },
		{ href: resolve('/territorio'), label: 'Estados' },
		{ href: resolve('/setores'), label: 'Atividades' }
	];

	const isCurrent = (href: string) =>
		href === resolve('/') ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>

<header class="site-header">
	<div class="l-page l-cluster header-inner">
		<a class="brand" href={resolve('/')}>Observatório SST</a>
		<nav aria-label="Seções">
			<ul class="l-cluster sections">
				{#each sections as section (section.href)}
					<li>
						<a href={section.href} aria-current={isCurrent(section.href) ? 'page' : undefined}
							>{section.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</header>

<main id="conteudo" class="l-page">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="l-page">
		<small>
			Fontes: INSS, Previdência Social, MTE/PDET, OIT. Trabalho de Graduação, Fatec Indaiatuba.
		</small>
	</div>
</footer>

<Toasts />

<style>
	.skip-link {
		position: absolute;
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
		border-block-end: var(--border);
		padding-block: var(--space-4);
	}

	.header-inner {
		justify-content: space-between;
	}

	.brand {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
		text-decoration: none;
	}

	.sections {
		--cluster-gap: var(--space-5);

		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	.sections a {
		color: var(--ink-2);
		text-decoration: none;
	}

	.sections a[aria-current='page'] {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 0.35em;
	}

	main {
		padding-block: var(--space-7);
	}

	.site-footer {
		border-block-start: var(--border);
		padding-block: var(--space-5);
	}
</style>
