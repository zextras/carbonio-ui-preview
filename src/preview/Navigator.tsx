/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import styled from 'styled-components';

const StyledContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	position: absolute;
	z-index: 1;
	bottom: 16px;
	background-color: ${({ theme }): string => theme.palette.gray0.regular};
	align-self: center;
	border-radius: 4px;
	gap: 16px;
	padding: 8px 16px;
`;

export interface NavigatorProps {
	children: React.ReactElement | React.ReactElement[];
}

export const Navigator = ({ children }: NavigatorProps): JSX.Element => (
	<StyledContainer onClick={(ev): void => ev.stopPropagation()}>{children}</StyledContainer>
);
