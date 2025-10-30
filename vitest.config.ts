/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Test environment - using happy-dom
		environment: 'jsdom',

		// Setup files to run before each test
		setupFiles: ['./src/tests/vitest-setup.ts'],

		// Enable globals (describe, it, expect, etc.)
		globals: true,

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'cobertura', 'lcov'],
			include: ['src/**/*.{js,ts,jsx,tsx}'],
			exclude: [
				'**/node_modules/**',
				'src/tests/**',
				'src/types/**',
				'**/*.test.*',
				'**/*.spec.*',
				'coverage/**',
				'lib/**',
				'lib-esm/**'
			]
		},

		// Restore mocks before every test
		restoreMocks: true,

		// Test path ignore patterns
		exclude: ['**/node_modules/**', '**/coverage/**', '**/lib/**', '**/lib-esm/**'],

		// Module name mapping (like Jest's moduleNameMapper)
		alias: {
			'\\.(css|less)$': 'identity-obj-proxy'
		}
	}
});
