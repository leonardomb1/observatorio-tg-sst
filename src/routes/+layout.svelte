<script lang="ts">
	import '@fontsource-variable/source-serif-4';
	import '@fontsource-variable/source-sans-3';
	import '#lib/styles/app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Attachment } from 'svelte/attachments';
	import { prefersReducedMotion } from 'svelte/motion';
	import Toasts from '#lib/components/Toasts.svelte';
	import { setToaster, Toaster } from '#lib/components/toast.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	setToaster(new Toaster());

	const sections = [
		{ id: '', label: 'Visão geral' },
		{ id: 'estados', label: 'Estados' },
		{ id: 'atividades', label: 'Atividades' },
		{ id: 'como-acontece', label: 'Como acontece' },
		{ id: 'beneficios', label: 'Benefícios' },
		{ id: 'qualidade', label: 'Qualidade dos dados' }
	];

	const home = resolve('/(historia)');
	const onHome = $derived(page.route.id === '/(historia)');
	let active = $state('');

	/** On the home page links keep the filters, so jumping between sections never resets them. */
	const href = (id: string) => `${home}${onHome ? page.url.search : ''}${id ? `#${id}` : ''}`;

	const current = (id: string) => {
		if (onHome) return active === id ? 'location' : undefined;
		if (id === 'estados' && page.route.id === '/territorio/[uf]') return 'page';
		return undefined;
	};

	/**
	 * Scroll-spy: the current section is the last one whose top has passed the
	 * upper third of the viewport. On narrow screens the header strip scrolls
	 * sideways to keep the current link in view.
	 */
	const spy: Attachment<HTMLElement> = (nav) => {
		if (!onHome) return;
		const targets = [...document.querySelectorAll<HTMLElement>('[data-section]')];
		const passed: Record<string, boolean> = {};
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					passed[(entry.target as HTMLElement).dataset.section ?? ''] = entry.isIntersecting;
				}
				const last = targets.findLast((target) => passed[target.dataset.section ?? '']);
				if (!last) return;
				active = last.dataset.section ?? '';
				const link = nav.querySelector<HTMLElement>(`[data-target="${active}"]`);
				if (!link || nav.scrollWidth <= nav.clientWidth) return;
				nav.scrollTo({
					left: link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2,
					behavior: prefersReducedMotion.current ? 'instant' : 'smooth'
				});
			},
			{ rootMargin: '0px 0px -66% 0px' }
		);
		for (const target of targets) observer.observe(target);
		return () => {
			observer.disconnect();
		};
	};
</script>

<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>

<header class="site-header">
	<div class="l-page header-inner">
		<a class="brand" href={home}>Observatório SST</a>
		<nav aria-label="Seções" {@attach spy}>
			<ul class="sections">
				{#each sections as section (section.id)}
					<li>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built from the resolved home path -->
						<a href={href(section.id)} aria-current={current(section.id)} data-target={section.id}
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
		gap: var(--space-2) var(--space-5);
		align-items: baseline;
		justify-content: space-between;
	}

	.brand {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
		text-decoration: none;
	}

	nav {
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
		display: inline-block;
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

	main {
		padding-block: var(--space-7);
	}

	.site-footer {
		border-block-start: var(--border);
		padding-block: var(--space-5);
	}
</style>
