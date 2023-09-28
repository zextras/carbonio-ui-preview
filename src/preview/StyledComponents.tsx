/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IconButton } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

export const AbsoluteLeftIconButton = styled(IconButton)`
	position: absolute;
	left: 0.5rem;
	top: 50%;
	z-index: 1;
`;

export const AbsoluteRightIconButton = styled(IconButton)`
	position: absolute;
	right: 0.5rem;
	top: 50%;
`;
