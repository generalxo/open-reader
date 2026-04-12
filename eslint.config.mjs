import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
	globalIgnores([
		'dist',
		'coverage',
		'src/routeTree.gen.ts',
	]),
	// Renderer (React + Vite) files
	{
		files: ['**/*.{ts,tsx}'],
		ignores: ['src/electron/**'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommendedTypeChecked,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			globals: globals.browser,
			parserOptions: {
				project: ["./tsconfig.app.json", "./tsconfig.node.json"],
			},
		},
		rules: {
			'no-console': 'warn',
			'no-debugger': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_' }
			],
		},
	},
	// Electron main process files
	{
		files: ['src/electron/**/*.ts'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
		],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: globals.node,
			parserOptions: {
				project: ['./src/electron/tsconfig.json'],
			},
		},
		rules: {
			'no-console': 'warn',
			'no-debugger': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_' }
			],
		},
	},
	// TanStack Router route files — Route exports are not React components
	{
		files: ['src/routes/**/*.tsx'],
		rules: {
			'react-refresh/only-export-components': 'off',
		},
	},
])
