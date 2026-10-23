<script lang="ts">
	import '@fontsource-variable/source-serif-4';
	import '@fontsource-variable/source-sans-3';
	import '#lib/styles/app.css';
	import { resolve } from '$app/paths';
	import Toasts from '#lib/components/Toasts.svelte';
	import { setToaster, Toaster } from '#lib/components/toast.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	setToaster(new Toaster());
</script>

<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>

<header class="site-header">
	<div class="l-page l-cluster header-inner">
		<a class="brand" href={resolve('/')}>Observatório SST</a>
		<span class="tagline">Acidentalidade do trabalho no Brasil a partir de dados públicos</span>
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

	.tagline {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	main {
		padding-block: var(--space-7);
	}

	.site-footer {
		border-block-start: var(--border);
		padding-block: var(--space-5);
	}
</style>
