/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { Container, IconButton, Tooltip } from '@zextras/carbonio-design-system';
import styled, { css, SimpleInterpolation } from 'styled-components';

const CustomIconButton = styled(IconButton)`
	${({ disabled }): SimpleInterpolation =>
		disabled &&
		css`
			background: rgba(204, 204, 204, 0.2);
			& > svg {
				background: unset;
			}
		`};
	& > svg {
		width: 1.25rem;
		height: 1.25rem;
	}
`;

export interface ZoomControllerProps {
	decrementable: boolean;
	zoomOutLabel: string | undefined;
	lowerLimitReachedLabel: string | undefined;
	decreaseByStep: (event: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => void;
	fitToWidthActive: boolean;
	resetZoomLabel: string | undefined;
	fitToWidthLabel: string | undefined;
	resetWidth: (event: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => void;
	fitToWidth: (ev: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => void;
	incrementable: boolean;
	zoomInLabel: string | undefined;
	upperLimitReachedLabel: string | undefined;
	increaseByStep: (event: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => void;
}

export const ZoomController = ({
	decrementable,
	fitToWidth,
	fitToWidthActive,
	fitToWidthLabel = 'Fit to width',
	incrementable,
	lowerLimitReachedLabel = 'Minimum zoom level reached',
	decreaseByStep,
	increaseByStep,
	resetWidth,
	resetZoomLabel = 'Reset zoom',
	upperLimitReachedLabel = 'Maximum zoom level reached',
	zoomInLabel = 'Zoom in',
	zoomOutLabel = 'Zoom out'
}: ZoomControllerProps): JSX.Element => (
	<Container orientation="horizontal" gap="0.5rem" width="fit">
		<Tooltip label={decrementable ? zoomOutLabel : lowerLimitReachedLabel}>
			<CustomIconButton
				disabled={!decrementable}
				icon="Minus"
				size="small"
				backgroundColor="gray0"
				iconColor="gray6"
				onClick={decreaseByStep}
			/>
		</Tooltip>
		<Tooltip label={fitToWidthActive ? resetZoomLabel : fitToWidthLabel}>
			<CustomIconButton
				icon={fitToWidthActive ? 'MinimizeOutline' : 'MaximizeOutline'}
				size="small"
				backgroundColor="gray0"
				iconColor="gray6"
				onClick={fitToWidthActive ? resetWidth : fitToWidth}
			/>
		</Tooltip>
		<Tooltip label={incrementable ? zoomInLabel : upperLimitReachedLabel}>
			<CustomIconButton
				icon="Plus"
				size="small"
				backgroundColor="gray0"
				iconColor="gray6"
				onClick={increaseByStep}
				disabled={!incrementable}
			/>
		</Tooltip>
	</Container>
);
