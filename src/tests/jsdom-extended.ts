/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Environment } from 'vitest';
import { populateGlobal } from 'vitest/environments';

export default <Environment>{
	name: 'jsdom-extended',
	transformMode: 'ssr',
	async setup(global) {
		// Use populateGlobal from jsdom
		const { teardown } = await populateGlobal(
			global,
			{
				bindFunctions: true
			},
			'jsdom'
		);

		// Add missing globals from Node.js environment
		// eslint-disable-next-line no-param-reassign
		global.ReadableStream = ReadableStream;
		// eslint-disable-next-line no-param-reassign
		global.TextDecoder = TextDecoder;
		// eslint-disable-next-line no-param-reassign
		global.TextEncoder = TextEncoder;
		// eslint-disable-next-line no-param-reassign
		global.Blob = Blob;
		// eslint-disable-next-line no-param-reassign
		global.Headers = Headers;
		// eslint-disable-next-line no-param-reassign
		global.FormData = FormData;
		// eslint-disable-next-line no-param-reassign
		global.Request = Request;
		// eslint-disable-next-line no-param-reassign
		global.Response = Response;
		// eslint-disable-next-line no-param-reassign
		global.fetch = fetch;

		return {
			teardown
		};
	}
};
