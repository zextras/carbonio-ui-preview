/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-dts';

export default defineConfig(() => ({
	build: {
		lib: {
			entry: path.resolve(__dirname, 'src/index.ts'),
			formats: ['es']
		},
		rollupOptions: {
			external: [
				'@zextras/carbonio-design-system',
				'lodash',
				'react',
				'react-dom',
				'styled-components'
			]
		}
	},
	plugins: [
		dts()
	]
}));
