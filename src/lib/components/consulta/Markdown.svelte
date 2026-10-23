<script lang="ts">
	import MarkdownIt from 'markdown-it';

	interface Props {
		text: string;
		/** Citation numbers that have a source on the page; others stay as plain text. */
		refs: ReadonlySet<number>;
	}

	let { text, refs }: Props = $props();

	const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });
	const defaultLink = markdown.renderer.rules.link_open;
	markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
		tokens[index]?.attrSet('rel', 'noopener noreferrer');
		tokens[index]?.attrSet('target', '_blank');
		return defaultLink
			? defaultLink(tokens, index, options, env, self)
			: self.renderToken(tokens, index, options);
	};

	const html = $derived(
		markdown
			.render(text)
			.replace(/\[(\d{1,4})\]/g, (match, number: string) =>
				refs.has(Number(number))
					? `<a class="ref" href="#fonte-${number}" aria-label="Fonte ${number}">${number}</a>`
					: match
			)
	);
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown-it escapes raw HTML (html: false) -->
<div class="prose">{@html html}</div>

<style>
	.prose {
		max-inline-size: var(--measure);
		line-height: var(--leading);
	}

	.prose :global(> * + *) {
		margin-block-start: var(--space-3);
	}

	.prose :global(ul),
	.prose :global(ol) {
		padding-inline-start: var(--space-5);
	}

	.prose :global(li + li) {
		margin-block-start: var(--space-1);
	}

	.prose :global(h1),
	.prose :global(h2),
	.prose :global(h3) {
		font-size: var(--text-base);
		font-weight: 600;
	}

	.prose :global(code) {
		font-size: 0.92em;
	}

	.prose :global(.ref) {
		display: inline-block;
		min-inline-size: 1.4em;
		padding-inline: var(--space-1);
		margin-inline-start: 0.1em;
		border: var(--border);
		border-radius: var(--radius);
		color: var(--ink-2);
		font-size: var(--text-xs);
		line-height: 1.4;
		text-align: center;
		text-decoration: none;
		vertical-align: 0.15em;
	}

	.prose :global(.ref:hover) {
		border-color: var(--ink);
		color: var(--ink);
	}
</style>
