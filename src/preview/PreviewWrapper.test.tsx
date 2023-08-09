/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';

import { PreviewWrapper } from './PreviewWrapper';
import { SELECTORS } from '../constants/test';
import { setup } from 'test-utils';

describe('Preview Wrapper', () => {
	test('Render the pdf preview for type pdf', async () => {
		const onClose = jest.fn();
		setup(<PreviewWrapper show src="" onClose={onClose} previewType="pdf" />);
		await screen.findByTestId(SELECTORS.previewContainer);
		expect(screen.getByTestId(SELECTORS.previewContainer)).toBeVisible();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	test('Render the image previewer for type image', async () => {
		const onClose = jest.fn();
		setup(<PreviewWrapper show src="" onClose={onClose} previewType="image" />);
		await screen.findByRole('img');
		expect(screen.getByRole('img')).toBeVisible();
		expect(screen.queryByTestId(SELECTORS.previewContainer)).not.toBeInTheDocument();
	});
});
