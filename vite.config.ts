/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-dts';

const isExternal = (id: string): boolean => !id.startsWith('.') && !path.isAbsolute(id);

export default defineConfig(() => ({
	build: {
		lib: {
			entry: path.resolve(__dirname, 'src/index.ts'),
			formats: ['es']
		},
		rollupOptions: {
			external: isExternal
		}
	},
	plugins: [dts()]
}));
