<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const sections = [
		{ href: resolve('/admin/documentos'), label: 'Documentos' },
		{ href: resolve('/admin/busca'), label: 'Busca de teste' },
		{ href: resolve('/admin/tarefas'), label: 'Tarefas' }
	];
</script>

<div class="admin l-stack">
	<nav class="l-cluster" aria-label="Administração">
		<strong>Administração</strong>
		{#each sections as section (section.href)}
			<a
				href={section.href}
				aria-current={page.url.pathname.startsWith(section.href) ? 'page' : undefined}
				>{section.label}</a
			>
		{/each}
		{#if data.admin}
			<form method="POST" action={resolve('/admin/sair')} class="user">
				<span>{data.admin.username}</span>
				<button type="submit">Sair</button>
			</form>
		{/if}
	</nav>
	{@render children()}
</div>

<style>
	.admin {
		--stack-gap: var(--space-6);
	}

	nav {
		--cluster-gap: var(--space-5);

		padding-block-end: var(--space-3);
		border-block-end: var(--border);
		font-size: var(--text-sm);
	}

	nav a {
		color: var(--ink-2);
		text-decoration: none;
	}

	nav a[aria-current='page'] {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-thickness: 2px;
	}

	.user {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		margin-inline-start: auto;
		color: var(--ink-2);
	}

	.user button {
		padding: 0;
		border: 0;
		background: none;
		text-decoration: underline;
	}
</style>
