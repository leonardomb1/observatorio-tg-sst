<script lang="ts">
	import '@fontsource-variable/source-serif-4';
	import '@fontsource-variable/source-sans-3';
	import '#lib/styles/app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Attachment } from 'svelte/attachments';
	import { prefersReducedMotion } from 'svelte/motion';
	import { AUTHOR, CONTACT_EMAIL } from '#lib/contact.ts';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { setToaster, Toaster } from '#lib/components/toast.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	setToaster(new Toaster());

	const sections: { id: string; label: string; icon: IconName }[] = [
		{ id: '', label: 'Visão geral', icon: 'chart' },
		{ id: 'estados', label: 'Estados', icon: 'map' },
		{ id: 'atividades', label: 'Atividades', icon: 'factory' },
		{ id: 'como-acontece', label: 'Como acontece', icon: 'triangle-alert' },
		{ id: 'beneficios', label: 'Benefícios', icon: 'wallet' }
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
							><Icon name={section.icon} />{section.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
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
				<a href={resolve('/(institucional)/sobre')}>Observatório SST</a> · {AUTHOR}
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

	@media (width < 60rem) {
		nav {
			flex-basis: 100%;
			order: 1;
		}
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
