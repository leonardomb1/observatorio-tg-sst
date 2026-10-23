/** @type {import('stylelint').Config} */
export default {
	extends: ['stylelint-config-standard'],
	rules: {
		'custom-property-empty-line-before': null,
		'import-notation': 'string',
		'selector-class-pattern': [
			'^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
			{ message: 'Use kebab-case class names' }
		]
	},
	overrides: [
		{
			files: ['**/*.svelte'],
			customSyntax: 'postcss-html',
			rules: {
				'color-no-hex': [true, { message: 'Use a colour token from tokens.css' }],
				'color-named': ['never', { message: 'Use a colour token from tokens.css' }],
				'function-disallowed-list': [
					['rgb', 'rgba', 'hsl', 'hsla', 'oklch'],
					{ message: 'Use a colour token from tokens.css' }
				],
				'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }]
			}
		}
	]
};
