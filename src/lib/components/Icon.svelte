<script lang="ts" module>
	/** Line icons drawn from Lucide's paths (ISC licence), inlined so the site needs no icon font. */
	const ICONS = {
		activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
		'arrow-down': ['M12 5v14', 'm19 12-7 7-7-7'],
		'arrow-up': ['M12 19V5', 'm5 12 7-7 7 7'],
		book: [
			'M12 7v14',
			'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'
		],
		chart: ['M3 3v16a2 2 0 0 0 2 2h16', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
		check: ['M20 6 9 17l-5-5'],
		'chevron-down': ['m6 9 6 6 6-6'],
		copy: [
			'M10 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z',
			'M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1'
		],
		database: [
			'M21 5c0 1.66-4.03 3-9 3S3 6.66 3 5s4.03-3 9-3 9 1.34 9 3z',
			'M3 5v14a9 3 0 0 0 18 0V5',
			'M3 12a9 3 0 0 0 18 0'
		],
		download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
		external: [
			'M15 3h6v6',
			'M10 14 21 3',
			'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'
		],
		factory: [
			'M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z',
			'M17 18h1',
			'M12 18h1',
			'M7 18h1'
		],
		file: [
			'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
			'M14 2v4a2 2 0 0 0 2 2h4',
			'M16 13H8',
			'M16 17H8',
			'M10 9H8'
		],
		'heart-pulse': [
			'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
			'M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27'
		],
		info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'M12 16v-4', 'M12 8h.01'],
		map: [
			'M14.1 5.6a2 2 0 0 0 1.8 0l3.7-1.9A1 1 0 0 1 21 4.6v12.8a1 1 0 0 1-.6.9l-4.5 2.3a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.7 1.8A1 1 0 0 1 3 19.4V6.6a1 1 0 0 1 .6-.9l4.5-2.3a2 2 0 0 1 1.8 0z',
			'M15 5.8v15',
			'M9 3.2v15'
		],
		'message-circle': ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
		plus: ['M5 12h14', 'M12 5v14'],
		table: [
			'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
			'M3 9h18',
			'M3 15h18',
			'M12 3v18'
		],
		'triangle-alert': [
			'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
			'M12 9v4',
			'M12 17h.01'
		],
		user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'],
		wallet: [
			'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
			'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'
		],
		x: ['M18 6 6 18', 'm6 6 12 12']
	} satisfies Record<string, string[]>;

	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		/** Size in em, so the icon follows the surrounding text. */
		size?: number;
	}

	let { name, size = 1.1 }: Props = $props();
</script>

<svg
	class="icon"
	style:--icon-size="{size}em"
	viewBox="0 0 24 24"
	aria-hidden="true"
	focusable="false"
>
	{#each ICONS[name] as d (d)}<path {d} />{/each}
</svg>

<style>
	.icon {
		flex: none;
		inline-size: var(--icon-size);
		block-size: var(--icon-size);
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.75;
		stroke-linecap: round;
		stroke-linejoin: round;
		vertical-align: -0.15em;
	}
</style>
