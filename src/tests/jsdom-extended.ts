/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { populateGlobal } from 'vitest/environments';
import type { Environment } from 'vitest';

export default <Environment>{
	name: 'jsdom-extended',
	transformMode: 'ssr',
	async setup(global) {
		// Use populateGlobal from jsdom
		const { teardown } = await populateGlobal(global, {
			bindFunctions: true
		}, 'jsdom');

		// Add missing globals from Node.js environment
		global.ReadableStream = ReadableStream;
		global.TextDecoder = TextDecoder;
		global.TextEncoder = TextEncoder;
		global.Blob = Blob;
		global.Headers = Headers;
		global.FormData = FormData;
		global.Request = Request;
		global.Response = Response;
		global.fetch = fetch;

		return {
			teardown
		};
	}
};
