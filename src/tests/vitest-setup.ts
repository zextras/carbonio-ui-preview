/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import failOnConsole from 'vitest-fail-on-console';

failOnConsole();

beforeAll(() => {
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

afterEach(() => {
	window.resizeTo(1024, 768);
});
