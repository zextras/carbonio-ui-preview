/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineConfig } from 'vitest/config';

const isCI = process.env.CI === 'true';

export default defineConfig({
	test: {
		reporters: isCI ? ['default', 'junit'] : ['verbose'],
		outputFile: {
			junit: './junit.xml'
		},
		retry: isCI ? 2 : 0,
		environment: 'jsdom',
		setupFiles: ['./src/tests/vitest-setup.ts'],
		restoreMocks: true,
		maxWorkers: isCI ? 2 : undefined,
		coverage: {
			enabled: true,
			provider: 'v8',
			reporter: isCI ? ['text', 'cobertura', 'lcov'] : ['text', 'html'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: [
				// Test files
				'**/*.test.{ts,tsx}',
				'**/*.spec.{ts,tsx}',

				// Type definitions
				'**/*.d.ts',

				// Test utilities
				'**/setupTests.{ts,tsx}',
				'**/testUtils.{ts,tsx}',
				'**/test-utils.{ts,tsx}',
				'**/vitest-setup.ts',

				// Test folders
				'**/__tests__/**',
				'**/__mocks__/**',

				// Build artifacts
				'**/dist/**',
				'**/coverage/**',
				'**/node_modules/**'
			],
			thresholds: {
				branches: 75,
				functions: 75,
				lines: 75,
				statements: 75
			}
		},
		globals: true,
		testTimeout: 60000
	}
});
