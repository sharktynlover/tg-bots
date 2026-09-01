import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['node_modules/**', 'drizzle/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.node },
		},
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			// Классы, внедряемые через tsyringe, попадают в decorator metadata,
			// поэтому импортировать их как type нельзя.
			'@typescript-eslint/consistent-type-imports': 'off',
		},
	},
);
