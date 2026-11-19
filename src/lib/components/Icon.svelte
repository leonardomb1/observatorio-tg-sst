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
		briefcase: [
			'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
			'M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'
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
		globe: [
			'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
			'M12 3a13.5 13.5 0 0 0 0 18 13.5 13.5 0 0 0 0-18',
			'M3 12h18'
		],
		'heart-pulse': [
			'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
			'M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27'
		],
		info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'M12 16v-4', 'M12 8h.01'],
		layers: [
			'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z',
			'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65',
			'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'
		],
		link: [
			'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
			'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'
		],
		map: [
			'M14.1 5.6a2 2 0 0 0 1.8 0l3.7-1.9A1 1 0 0 1 21 4.6v12.8a1 1 0 0 1-.6.9l-4.5 2.3a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.7 1.8A1 1 0 0 1 3 19.4V6.6a1 1 0 0 1 .6-.9l4.5-2.3a2 2 0 0 1 1.8 0z',
			'M15 5.8v15',
			'M9 3.2v15'
		],
		'message-circle': ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
		'message-square-text': [
			'M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z',
			'M7 11h10',
			'M7 15h4',
			'M7 7h8'
		],
		pencil: [
			'M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
			'M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z'
		],
		plus: ['M5 12h14', 'M12 5v14'],
		repeat: [
			'm17 2 4 4-4 4',
			'M3 11v-1a4 4 0 0 1 4-4h14',
			'm7 22-4-4 4-4',
			'M21 13v1a4 4 0 0 1-4 4H3'
		],
		table: [
			'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
			'M3 9h18',
			'M3 15h18',
			'M12 3v18'
		],
		trash: [
			'M3 6h18',
			'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
			'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
			'M10 11v6',
			'M14 11v6'
		],
		'triangle-alert': [
			'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
			'M12 9v4',
			'M12 17h.01'
		],
		truck: [
			'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2',
			'M15 18H9',
			'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14',
			'M19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
			'M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z'
		],
		user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'],
		users: [
			'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
			'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
			'M22 21v-2a4 4 0 0 0-3-3.87',
			'M16 3.13a4 4 0 0 1 0 7.75'
		],
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
