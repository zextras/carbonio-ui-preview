/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useContext, useEffect } from 'react';

import { screen } from '@testing-library/react';

import {
	PreviewManager,
	PreviewManagerContextType,
	PreviewsManagerContext
} from './PreviewManager';
import { KEYBOARD_KEY, SELECTORS } from '../constants/test';
import { setup } from 'test-utils';

const PreviewManagerTester = (
	props: Parameters<PreviewManagerContextType['createPreview']>[0]
): JSX.Element => {
	const { createPreview } = useContext(PreviewsManagerContext);
	const onClickHandler = (): void => {
		createPreview(props);
	};
	return <button onClick={onClickHandler}>Create preview</button>;
};

const PreviewManagerInitTester = (props: {
	initPar: Parameters<PreviewManagerContextType['initPreview']>[0];
	idToOpen: string;
}): JSX.Element => {
	const { initPreview, openPreview } = useContext(PreviewsManagerContext);
	const { idToOpen, initPar } = props;
	useEffect(() => {
		initPreview(initPar);
	}, [initPar, initPreview]);

	const onClickHandler = (): void => {
		openPreview(idToOpen);
	};
	return <button onClick={onClickHandler}>Open preview</button>;
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
		expect(screen.queryByTestId(SELECTORS.previewContainer)).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /create preview/i }));
		await screen.findByTestId(SELECTORS.previewContainer);
		expect(screen.getByTestId(SELECTORS.previewContainer)).toBeVisible();
		await user.keyboard(KEYBOARD_KEY.ESC);
		expect(onClose).toHaveBeenCalled();
		expect(screen.queryByTestId(SELECTORS.previewContainer)).not.toBeInTheDocument();
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
		await user.keyboard(KEYBOARD_KEY.ESC);
		expect(onClose).toHaveBeenCalled();
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	test('Multiple calls to createPreview replace the previewer', async () => {
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

	describe('keyboard shortcuts', () => {
		test('ArrowRight and ArrowLeft', async () => {
			const onClose = jest.fn();
			const { user } = setup(
				<PreviewManager>
					<PreviewManagerInitTester
						initPar={[
							{ id: 'id1', previewType: 'pdf', filename: 'alpha', src: '', onClose },
							{ id: 'id2', previewType: 'image', filename: 'beta', src: '', onClose },
							{ id: 'id3', previewType: 'pdf', filename: 'gamma', src: '', onClose }
						]}
						idToOpen={'id1'}
					/>
				</PreviewManager>
			);

			expect(screen.getByRole('button', { name: /open preview/i })).toBeVisible();
			expect(screen.queryByTestId(SELECTORS.previewContainer)).not.toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: /open preview/i }));
			await screen.findByTestId(SELECTORS.previewContainer);
			expect(screen.getByTestId(SELECTORS.previewContainer)).toBeVisible();

			expect(screen.getByText(/alpha/i)).toBeVisible();

			let pageInput = screen.getByRole('textbox', { name: /current page/i });
			await user.click(pageInput);
			expect(pageInput).toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ARROW_RIGHT);
			expect(screen.getByText(/alpha/i)).toBeVisible();
			// remove focus
			await user.keyboard(KEYBOARD_KEY.ESC);
			expect(pageInput).not.toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ARROW_RIGHT);
			expect(screen.getByText(/beta/i)).toBeVisible();
			await user.keyboard(KEYBOARD_KEY.ARROW_RIGHT);
			expect(screen.getByText(/gamma/i)).toBeVisible();
			await user.keyboard(KEYBOARD_KEY.ARROW_RIGHT);
			expect(screen.getByText(/gamma/i)).toBeVisible();
			pageInput = screen.getByRole('textbox', { name: /current page/i });
			await user.click(pageInput);
			expect(pageInput).toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ARROW_LEFT);
			expect(screen.getByText(/gamma/i)).toBeVisible();
			// remove focus
			await user.keyboard(KEYBOARD_KEY.ESC);
			expect(pageInput).not.toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ARROW_LEFT);
			expect(screen.getByText(/beta/i)).toBeVisible();
			await user.keyboard(KEYBOARD_KEY.ARROW_LEFT);
			expect(screen.getByText(/alpha/i)).toBeVisible();
			await user.keyboard(KEYBOARD_KEY.ARROW_LEFT);
			expect(screen.getByText(/alpha/i)).toBeVisible();
		});
	});
});
