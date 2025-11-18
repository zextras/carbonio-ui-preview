/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useEffect, useState } from 'react';

import { faker } from '@faker-js/faker';
import type { DocumentProps, PageProps } from 'react-pdf';

type ReactPdfDocument = Parameters<NonNullable<DocumentProps['onLoadSuccess']>>[0];

export const Document = ({
	children,
	onLoadSuccess,
	loading,
	file,
	noData
}: DocumentProps): React.JSX.Element => {
	const [isLoading, setIsLoading] = useState(false);
	useEffect(() => {
		setIsLoading(true);
		const timeout = setTimeout(
			() => {
				setIsLoading(false);
				onLoadSuccess?.({ numPages: 4 } as ReactPdfDocument);
			},
			// this timeout must be under the limit configured in rtl
			faker.number.int({ min: 1, max: 100 })
		);

		return (): void => {
			clearTimeout(timeout);
			setIsLoading(false);
		};
	}, [onLoadSuccess]);

	return (
		<div data-testid={'react-pdf-document'}>
			{isLoading && (typeof loading === 'function' ? loading() : loading)}
			{!isLoading && !file && (typeof noData === 'function' ? noData() : noData)}
			{!isLoading && file && children}
		</div>
	);
};

export const Page = ({ pageNumber, pageIndex, inputRef, width }: PageProps): React.JSX.Element => (
	<div
		data-testid={'react-pdf-page'}
		data-page-number={pageNumber ?? pageIndex}
		data-page-width={width}
		ref={inputRef as React.LegacyRef<HTMLDivElement>}
	></div>
);
