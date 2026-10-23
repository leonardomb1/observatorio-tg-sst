<script lang="ts" generics="Row">
	import type { Column } from '#lib/csv.ts';

	const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

	interface Props {
		caption: string;
		columns: readonly Column<Row>[];
		rows: readonly Row[];
	}

	let { caption, columns, rows }: Props = $props();

	function display(column: Column<Row>, row: Row): string {
		const value = row[column.key];
		if (column.format) return column.format(value);
		if (value === null || value === undefined) return '—';
		if (typeof value === 'number') return number.format(value);
		return String(value);
	}
</script>

<div class="scroll">
	<table>
		<caption class="visually-hidden">{caption}</caption>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th scope="col" data-numeric={column.numeric ? '' : undefined}>{column.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, index (index)}
				<tr>
					{#each columns as column (column.key)}
						<td data-numeric={column.numeric ? '' : undefined}>{display(column, row)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.scroll {
		max-block-size: 28rem;
		overflow: auto;
	}

	thead th {
		position: sticky;
		inset-block-start: 0;
		background: var(--surface);
	}
</style>
