/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as React from 'react';

import {
	ByRoleMatcher,
	ByRoleOptions,
	GetAllBy,
	queries,
	queryHelpers,
	render,
	RenderOptions,
	RenderResult,
	waitFor,
	within as rtlWithin,
	screen as rtlScreen
} from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ThemeProvider } from '@zextras/carbonio-design-system';
import * as fs from 'fs';

type ExtendedQueries = typeof queries & typeof customQueries;

type ByRoleWithIconOptions = ByRoleOptions & {
	icon: string | RegExp;
};

/**
 * Matcher function to search an icon button through the icon data-testid
 */
const queryAllByRoleWithIcon: GetAllBy<[ByRoleMatcher, ByRoleWithIconOptions]> = (
	container,
	role,
	{ icon, ...options }
) =>
	rtlScreen
		// eslint-disable-next-line testing-library/prefer-screen-queries
		.queryAllByRole('button', options)
		.filter((element) => rtlWithin(element).queryByTestId(icon) !== null);
const getByRoleWithIconMultipleError = (
	container: Element | null,
	role: ByRoleMatcher,
	options: ByRoleWithIconOptions
): string => `Found multiple elements with role ${role} and icon ${options.icon}`;
const getByRoleWithIconMissingError = (
	container: Element | null,
	role: ByRoleMatcher,
	options: ByRoleWithIconOptions
): string => `Unable to find an element with role ${role} and icon ${options.icon}`;

const [
	queryByRoleWithIcon,
	getAllByRoleWithIcon,
	getByRoleWithIcon,
	findAllByRoleWithIcon,
	findByRoleWithIcon
] = queryHelpers.buildQueries<[ByRoleMatcher, ByRoleWithIconOptions]>(
	queryAllByRoleWithIcon,
	getByRoleWithIconMultipleError,
	getByRoleWithIconMissingError
);

const customQueries = {
	// byRoleWithIcon
	queryByRoleWithIcon,
	getAllByRoleWithIcon,
	getByRoleWithIcon,
	findAllByRoleWithIcon,
	findByRoleWithIcon
};
const extendedQueries: ExtendedQueries = { ...queries, ...customQueries };

export const within = (
	element: Parameters<typeof rtlWithin<ExtendedQueries>>[0]
): ReturnType<typeof rtlWithin<ExtendedQueries>> => rtlWithin(element, extendedQueries);

export const screen = within(document.body);

interface ProvidersWrapperProps {
	children?: React.ReactNode;
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
		user: userEvent.setup(options?.setupOptions),
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
	const arrayBuffer = new Uint8Array(raw).buffer;

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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { calls } = (window.IntersectionObserver as any).mock;
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
