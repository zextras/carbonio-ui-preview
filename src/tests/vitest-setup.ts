/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import '@testing-library/jest-dom';
import { act } from '@testing-library/react';
import failOnConsole from 'jest-fail-on-console';
import { vi } from 'vitest';

// Mock react-pdf with the manual mock from __mocks__ directory
vi.mock('react-pdf');

// Add missing globals from Node.js environment that are needed in jsdom
globalThis.ReadableStream = ReadableStream;
globalThis.TextDecoder = TextDecoder;
globalThis.TextEncoder = TextEncoder;
globalThis.Blob = Blob;
globalThis.Headers = Headers;
globalThis.FormData = FormData;
globalThis.Request = Request;
globalThis.Response = Response;
globalThis.fetch = fetch;

// Polyfill for Promise.withResolvers (needed for pdfjs-dist)
if (!Promise.withResolvers) {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, func-names
	Promise.withResolvers = function <T>() {
		let resolve: (value: T | PromiseLike<T>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let reject: (reason?: any) => void;
		const promise = new Promise<T>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		return { promise, resolve: resolve!, reject: reject! };
	};
}

failOnConsole({
	shouldFailOnError: false,
	shouldFailOnWarn: false
});

beforeAll(() => {
	// https://jestjs.io/docs/en/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(), // Deprecated
			removeListener: vi.fn(), // Deprecated
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	});

	window.resizeTo = function resizeTo(width, height): void {
		Object.assign(this, {
			innerWidth: width,
			innerHeight: height,
			outerWidth: width,
			outerHeight: height
		}).dispatchEvent(new this.Event('resize'));
	};

	Object.defineProperty(window, 'IntersectionObserver', {
		writable: true,
		value: vi.fn(function IntersectionObserver(callback, options) {
			return {
				thresholds: options.threshold,
				root: options.root,
				rootMargin: options.rootMargin,
				observe: vi.fn(),
				unobserve: vi.fn(),
				disconnect: vi.fn()
			};
		})
	});

	Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
		writable: true,
		value: vi.fn()
	});

	Object.defineProperty(window.HTMLElement.prototype, 'scrollBy', {
		writable: true,
		value: vi.fn()
	});

	Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
		writable: true,
		value: () => undefined
	});
});

beforeEach(() => {
	// before each
});

afterEach(() => {
	act(() => {
		window.resizeTo(1024, 768);
	});
});

afterAll(() => {
	// after all
});
