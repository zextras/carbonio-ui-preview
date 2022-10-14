/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useRef } from 'react';

import { Button, Container, Text } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

const FakeModalContainer = styled(Container)`
	border-radius: 1rem;
	padding: 2rem 4rem 2rem 4rem;
	margin: auto;
`;

const AttachmentLink = styled.a`
	text-decoration: none;
	//position: relative;
`;

export interface PreviewCriteriaAlternativeContentProps {
	downloadSrc?: string;
	/** Src that allow open in separate tab */
	openSrc?: string;
	titleLabel?: string;
	contentLabel?: string;
	downloadLabel?: string;
	openLabel?: string;
	noteLabel?: string;
}

export const PreviewCriteriaAlternativeContent: React.VFC<
	PreviewCriteriaAlternativeContentProps
> = ({
	downloadSrc,
	openSrc,
	titleLabel = 'This item cannot be displayed',
	contentLabel = 'The file size exceeds the limit allowed and cannot be displayed',
	downloadLabel = 'DOWNLOAD FILE',
	openLabel = 'OPEN IN A SEPARATE TAB',
	noteLabel = 'Please, download it or open it in a separate tab'
}) => {
	const ancRef = useRef<HTMLAnchorElement>(null);
	const ancRef2 = useRef<HTMLAnchorElement>(null);

	const downloadClick = useCallback(
		(ev: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
			ev.preventDefault();
			if (ancRef.current) {
				ancRef.current.click();
			}
		},
		[ancRef]
	);

	const openClick = useCallback(
		(ev: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
			ev.preventDefault();
			if (ancRef2.current) {
				ancRef2.current.click();
			}
		},
		[ancRef2]
	);

	return (
		<FakeModalContainer
			background="gray0"
			crossAlignment="center"
			height="fit"
			width="fit"
			gap="1rem"
		>
			<Text size="large" color="gray6">
				{titleLabel}
			</Text>
			<Text size="medium" color="gray6" weight="bold">
				{contentLabel}
			</Text>
			<Container orientation="horizontal" height="fit" gap="0.5rem">
				{downloadSrc && (
					<Button
						label={downloadLabel}
						icon="DownloadOutline"
						width="fill"
						onClick={downloadClick}
					/>
				)}
				{openSrc && (
					<Button label={openLabel} icon="DiagonalArrowRightUp" width="fill" onClick={openClick} />
				)}
			</Container>
			<Text size="small" color="gray6">
				{noteLabel}
			</Text>
			{downloadSrc && <AttachmentLink rel="noopener" ref={ancRef} href={downloadSrc} />}
			{openSrc && <AttachmentLink rel="noopener" ref={ancRef2} href={openSrc} />}
		</FakeModalContainer>
	);
};
