/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useContext } from 'react';

import { screen } from '@testing-library/react';

import { setup } from '../utils/test-utils';
import {
	PreviewManager,
	PreviewManagerContextType,
	PreviewsManagerContext
} from './PreviewManager';

const PreviewManagerTester = (
	props: Parameters<PreviewManagerContextType['createPreview']>[0]
): JSX.Element => {
	const { createPreview } = useContext(PreviewsManagerContext);
	const onClickHandler = (): void => {
		createPreview(props);
	};
	return <button onClick={onClickHandler}>Create preview</button>;
};

describe('Preview Manager', () => {
	test('Show the preview of a pdf by calling createPreview and hide it with close action', async () => {
		const onClose = jest.fn();
		const { user } = setup(
			<PreviewManager>
				<PreviewManagerTester src="" previewType="pdf" onClose={onClose} />
			</PreviewManager>
		);

		expect(screen.getByRole('button', { name: /create preview/i })).toBeVisible();
		expect(screen.queryByTestId('pdf-preview-container')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /create preview/i }));
		await screen.findByTestId('pdf-preview-container');
		expect(screen.getByTestId('pdf-preview-container')).toBeVisible();
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalled();
		expect(screen.queryByTestId('pdf-preview-container')).not.toBeInTheDocument();
	});

	test('Show the preview of an image by calling createPreview and hide it with close action', async () => {
		const onClose = jest.fn();
		const { user } = setup(
			<PreviewManager>
				<PreviewManagerTester src="" previewType="image" onClose={onClose} />
			</PreviewManager>
		);

		expect(screen.getByRole('button', { name: /create preview/i })).toBeVisible();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /create preview/i }));
		await screen.findByRole('img');
		expect(screen.getByRole('img')).toBeVisible();
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalled();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	// FIXME: with current implementation, manager is opening more than 1 preview, stacking them
	//   Fix to make only 1 preview visible per time
	test.failing('Multiple calls to createPreview replace the previewer', async () => {
		const onClose = jest.fn();
		const { user } = setup(
			<PreviewManager>
				<PreviewManagerTester src="image.png" previewType="image" onClose={onClose} />
			</PreviewManager>
		);
		expect(screen.getByRole('button', { name: /create preview/i })).toBeVisible();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /create preview/i }));
		await screen.findByRole('img');
		expect(screen.getByRole('img')).toBeVisible();
		await user.click(screen.getByRole('button', { name: /create preview/i }));
		await screen.findByRole('img');
		expect(screen.getByRole('img')).toBeVisible();
	});
});
