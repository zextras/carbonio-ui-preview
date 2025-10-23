/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useEffect } from 'react';
import * as React from 'react';

import { screen } from '@testing-library/react';
import { Text } from '@zextras/carbonio-design-system';

// Mock react-pdf with the manual mock from __mocks__ directory
vi.mock('react-pdf');

import {
	PreviewItem,
	PreviewManager,
	PreviewManagerContextType,
	usePreview
} from './PreviewManager.js';
import { KEYBOARD_KEY, SELECTORS } from '../tests/constants.js';
import { setup } from '../tests/utils.js';

const PreviewManagerTester = (
	props: Parameters<PreviewManagerContextType['createPreview']>[0]
): React.JSX.Element => {
	const { createPreview } = usePreview();
	const onClickHandler = (): void => {
		createPreview(props);
	};
	return <button onClick={onClickHandler}>Create preview</button>;
};

const PreviewManagerInitTester = (props: {
	initPar: PreviewItem[];
	idToOpen: string;
}): React.JSX.Element => {
	const { initPreview, openPreview, currentIndex, previews, emptyPreview } = usePreview();
	const { idToOpen, initPar } = props;
	useEffect(() => {
		initPreview(initPar);
	}, [initPar, initPreview]);

	const onClickHandler = (): void => {
		openPreview(idToOpen);
	};
	return (
		<div>
			<Text>{`currentIndex: ${currentIndex}`}</Text>
			<Text>{`item lenght: ${previews.length}`}</Text>
			<button onClick={onClickHandler}>Open preview</button>
			<button onClick={emptyPreview}>Empty preview</button>
		</div>
	);
};

describe('Preview Manager', () => {
	test('Show the preview of a pdf by calling createPreview and hide it with close action', async () => {
		const onClose = vi.fn();
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
		const onClose = vi.fn();
		const { user } = setup(
			<PreviewManager>
				<PreviewManagerTester src="" previewType="image" onClose={onClose} />
			</PreviewManager>
		);

		expect(screen.getByRole('button', { name: /create preview/i })).toBeVisible();
		expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /create preview/i }));
		expect(await screen.findByRole('presentation')).toBeVisible();
		await user.keyboard(KEYBOARD_KEY.ESC);
		expect(onClose).toHaveBeenCalled();
		expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
	});

	test('Multiple calls to createPreview replace the previewer', async () => {
		const onClose = vi.fn();
		const { user } = setup(
			<PreviewManager>
				<PreviewManagerTester src="image.png" previewType="image" onClose={onClose} />
			</PreviewManager>
		);
		expect(screen.getByRole('button', { name: /create preview/i })).toBeVisible();
		expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /create preview/i }));
		expect(await screen.findByRole('presentation')).toBeVisible();
		await user.click(screen.getByRole('button', { name: /create preview/i }));
		expect(await screen.findByRole('presentation')).toBeVisible();
	});

	describe('keyboard shortcuts', () => {
		test('ArrowRight and ArrowLeft', async () => {
			const onClose = vi.fn();
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

	it('should return 0 as currentIndex when open the first item', async () => {
		const onClose = vi.fn();
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
		await user.click(screen.getByRole('button', { name: /open preview/i }));
		expect(screen.getByText(/currentIndex: 0/i)).toBeVisible();
	});

	it('should return 1 as currentIndex when open the second item', async () => {
		const onClose = vi.fn();
		const { user } = setup(
			<PreviewManager>
				<PreviewManagerInitTester
					initPar={[
						{ id: 'id1', previewType: 'pdf', filename: 'alpha', src: '', onClose },
						{ id: 'id2', previewType: 'image', filename: 'beta', src: '', onClose },
						{ id: 'id3', previewType: 'pdf', filename: 'gamma', src: '', onClose }
					]}
					idToOpen={'id2'}
				/>
			</PreviewManager>
		);
		await user.click(screen.getByRole('button', { name: /open preview/i }));
		expect(screen.getByText(/currentIndex: 1/i)).toBeVisible();
	});

	it('should return 2 as currentIndex when open the third item', async () => {
		const onClose = vi.fn();
		const { user } = setup(
			<PreviewManager>
				<PreviewManagerInitTester
					initPar={[
						{ id: 'id1', previewType: 'pdf', filename: 'alpha', src: '', onClose },
						{ id: 'id2', previewType: 'image', filename: 'beta', src: '', onClose },
						{ id: 'id3', previewType: 'pdf', filename: 'gamma', src: '', onClose }
					]}
					idToOpen={'id3'}
				/>
			</PreviewManager>
		);
		await user.click(screen.getByRole('button', { name: /open preview/i }));
		expect(screen.getByText(/currentIndex: 2/i)).toBeVisible();
	});

	it('should return 0 as item length after emptying the preview', async () => {
		const onClose = vi.fn();
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
		await user.click(screen.getByRole('button', { name: /open preview/i }));
		expect(screen.getByText(/item lenght: 3/i)).toBeVisible();
		await user.click(screen.getByRole('button', { name: /empty preview/i }));
		expect(screen.getByText(/item lenght: 0/i)).toBeVisible();
	});
});
