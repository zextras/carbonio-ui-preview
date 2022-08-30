/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useRef } from 'react';

import { Text, getColor, Container } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

const StyledInput = styled.input<{ $color: string; $size: string }>`
	background-color: inherit;
	border: none;
	outline: none;
	min-width: 8px;
	font-family: inherit;
	font-size: ${({ theme, $size }): string => theme.sizes.font[$size]};
	color: ${({ $color, theme }): string => getColor($color, theme)};
	text-align: center;
	padding: 0;
	&:hover,
	&:focus {
		text-decoration: underline;
	}
`;

export interface PageControllerProps {
	pageLabel?: string;
	currentPage: number;
	pagesNumber: number;
	onPageChange: (newPage: number) => void;
}

function isInt(value: string): boolean {
	const x = parseInt(value, 10);
	// compare number with string by removing leading zeros
	return `${x}` === value.replace(/^0+/, '').trim();
}

function resizeInput(ev: React.KeyboardEvent<HTMLInputElement>): void {
	const inputEl = ev.currentTarget;
	inputEl.style.width = `${inputEl.value.length}ch`;
}

export const PageController = ({
	pageLabel = 'Page',
	currentPage,
	pagesNumber,
	onPageChange
}: PageControllerProps): JSX.Element => {
	const inputRef = useRef<HTMLInputElement>(null);

	const setInputValue = useCallback((value: number) => {
		if (inputRef.current) {
			inputRef.current.value = `${value}`;
			inputRef.current.style.width = `${inputRef.current.value.length}ch`;
		}
	}, []);

	useEffect(() => {
		setInputValue(currentPage);
	}, [currentPage, setInputValue]);

	const onConfirm = useCallback<(e: React.SyntheticEvent<HTMLInputElement>) => void>(
		(e) => {
			const inputElement = e.currentTarget;
			if (inputElement) {
				const newValue = inputElement.value;
				const newPage = isInt(newValue) && Number(newValue);
				if (newPage !== false && newPage > 0 && newPage <= pagesNumber) {
					setInputValue(newPage);
					onPageChange(newPage);
				} else {
					setInputValue(currentPage);
				}
			}
		},
		[currentPage, onPageChange, pagesNumber, setInputValue]
	);

	const onBlur = useCallback<React.FocusEventHandler<HTMLInputElement>>(
		(e) => {
			onConfirm(e);
		},
		[onConfirm]
	);

	const onKeyUp = useCallback<React.KeyboardEventHandler<HTMLInputElement>>(
		(e) => {
			if (e.key === 'Enter') {
				onConfirm(e);
				e.currentTarget.blur();
			}
		},
		[onConfirm]
	);

	return (
		<Container orientation="horizontal" gap="8px" crossAlignment="baseline">
			<Text size="small" color="gray6">
				{pageLabel}
			</Text>
			<StyledInput
				$color="gray6"
				$size="small"
				onBlur={onBlur}
				onKeyUp={onKeyUp}
				onInput={resizeInput}
				ref={inputRef}
				aria-label="current page"
			/>
			<Text size="small" color="gray6">
				/
			</Text>
			<Text size="small" color="gray6">
				{pagesNumber}
			</Text>
		</Container>
	);
};
