<script lang="ts">
	import { anchorTo } from './anchor.ts';

	export interface Option {
		value: string;
		label: string;
		/** Secondary text shown after the label and used in search, e.g. a CNAE code. */
		hint?: string;
	}

	interface Props {
		label: string;
		options: readonly Option[];
		value: string | null;
		placeholder?: string;
		onchange: (value: string | null) => void;
		/** Maximum options rendered at once; long lists stay searchable. */
		limit?: number;
	}

	let { label, options, value, placeholder = 'Todos', onchange, limit = 50 }: Props = $props();

	const id = $props.id();
	let input = $state<HTMLInputElement>();
	let list = $state<HTMLElement>();
	let query = $state('');
	let active = $state(0);
	let open = $state(false);

	const selected = $derived(options.find((option) => option.value === value) ?? null);

	const normalize = (text: string) =>
		text
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase();

	const matches = $derived.by(() => {
		const needle = normalize(query.trim());
		const found = needle
			? options.filter((option) =>
					normalize(`${option.label} ${option.hint ?? ''}`).includes(needle)
				)
			: options;
		return found.slice(0, limit);
	});

	function show() {
		if (open) return;
		open = true;
		active = 0;
		list?.showPopover();
	}

	function hide() {
		open = false;
		query = '';
		list?.hidePopover();
	}

	function choose(option: Option | null) {
		onchange(option?.value ?? null);
		hide();
		input?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				show();
				active = Math.min(active + 1, matches.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				active = Math.max(active - 1, 0);
				break;
			case 'Enter': {
				const option = matches[active];
				if (open && option) {
					event.preventDefault();
					choose(option);
				}
				break;
			}
			case 'Escape':
				if (open) {
					event.preventDefault();
					hide();
				}
				break;
		}
	}
</script>

<div class="combobox">
	<label for="{id}-input">{label}</label>
	<div class="field">
		<input
			bind:this={input}
			id="{id}-input"
			type="text"
			role="combobox"
			autocomplete="off"
			spellcheck="false"
			aria-expanded={open}
			aria-controls="{id}-list"
			aria-activedescendant={open && matches[active] ? `${id}-option-${active}` : undefined}
			placeholder={selected ? selected.label : placeholder}
			value={open ? query : (selected?.label ?? '')}
			oninput={(event) => {
				query = event.currentTarget.value;
				active = 0;
				show();
			}}
			onfocus={show}
			onblur={(event) => {
				if (!list?.contains(event.relatedTarget as Node | null)) hide();
			}}
			{onkeydown}
		/>
		{#if selected}
			<button
				type="button"
				class="clear"
				aria-label="Limpar {label}"
				onclick={() => {
					choose(null);
				}}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
			</button>
		{/if}
	</div>

	<ul
		bind:this={list}
		id="{id}-list"
		class="list"
		role="listbox"
		aria-label={label}
		popover="manual"
		{@attach anchorTo(() => input)}
	>
		{#each matches as option, index (option.value)}
			<li
				id="{id}-option-{index}"
				role="option"
				aria-selected={option.value === value}
				data-active={index === active ? '' : undefined}
				onpointerdown={(event) => {
					event.preventDefault();
					choose(option);
				}}
				onpointermove={() => (active = index)}
			>
				<span>{option.label}</span>
				{#if option.hint}<span class="hint">{option.hint}</span>{/if}
			</li>
		{:else}
			<li class="empty" role="presentation">Nenhum resultado para “{query}”.</li>
		{/each}
	</ul>
</div>

<style>
	.combobox {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-inline-size: 12rem;
	}

	label {
		color: var(--ink-2);
		font-size: var(--text-xs);
	}

	.field {
		position: relative;
	}

	input {
		inline-size: 100%;
		padding: var(--space-2) var(--space-6) var(--space-2) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-sm);
	}

	input::placeholder {
		color: var(--ink-2);
	}

	.clear {
		position: absolute;
		inset-block: 0;
		inset-inline-end: var(--space-1);
		display: grid;
		place-items: center;
		inline-size: 1.75rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink-2);
	}

	svg {
		inline-size: 0.75rem;
		block-size: 0.75rem;
		stroke: currentcolor;
		stroke-width: 1.5;
	}

	.list {
		position: fixed;
		inset: auto;
		inline-size: max(16rem, 30vw);
		max-inline-size: calc(100vw - 1rem);
		max-block-size: 18rem;
		margin: 0;
		padding: var(--space-1) 0;
		overflow-y: auto;
		border: var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		list-style: none;
	}

	[role='option'] {
		display: flex;
		gap: var(--space-3);
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	[role='option'][data-active] {
		background: var(--neutral);
	}

	[role='option'][aria-selected='true'] {
		font-weight: 600;
	}

	.hint {
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
	}

	.empty {
		padding: var(--space-2) var(--space-3);
		color: var(--ink-2);
		font-size: var(--text-sm);
	}
</style>
