/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import * as fs from 'fs';

import React from 'react';

import { render, RenderOptions, RenderResult, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@zextras/carbonio-design-system';

interface ProvidersWrapperProps {
	children?: React.ReactElement;
}

const ProvidersWrapper = ({ children }: ProvidersWrapperProps): React.JSX.Element => (
	<ThemeProvider>{children}</ThemeProvider>
);

function customRender(
	ui: React.ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
	return render(ui, {
		wrapper: ProvidersWrapper,
		...options
	});
}

export function setup(
	ui: Parameters<typeof customRender>[0],
	options?: {
		renderOptions?: Parameters<typeof customRender>[1];
		setupOptions?: Parameters<(typeof userEvent)['setup']>[0];
	}
): { user: ReturnType<(typeof userEvent)['setup']> } & ReturnType<typeof render> {
	return {
		user: userEvent.setup({ advanceTimers: jest.advanceTimersByTime, ...options?.setupOptions }),
		...customRender(ui, options?.renderOptions)
	};
}

/*
 * Copied from https://github.com/wojtekmaj/react-pdf/blob/main/test-utils.js
 */
export const loadPDF = (
	path: string
): {
	raw: Buffer;
	arrayBuffer: ArrayBuffer;
	blob: Blob;
	data: Uint8Array;
	dataURI: string;
	file: File;
} => {
	const raw = fs.readFileSync(path);
	const arrayBuffer = raw.buffer;

	return {
		raw,
		arrayBuffer,
		get blob(): Blob {
			return new Blob([arrayBuffer], { type: 'application/pdf' });
		},
		get data(): Uint8Array {
			return new Uint8Array(raw);
		},
		get dataURI(): string {
			return `data:application/pdf;base64,${raw.toString('base64')}`;
		},
		get file(): File {
			return new File([arrayBuffer], 'test.pdf', { type: 'application/pdf' });
		}
	};
};

export async function triggerObserver(observedElement: HTMLElement): Promise<void> {
	const { calls } = (window.IntersectionObserver as jest.Mock<IntersectionObserver>).mock;
	const [onChange] = calls[calls.length - 1];
	// trigger the intersection on the observed element
	await waitFor(() =>
		onChange([
			{
				target: observedElement,
				isIntersecting: true
			}
		])
	);
}
