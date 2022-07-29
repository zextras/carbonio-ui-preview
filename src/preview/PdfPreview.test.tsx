/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';

import { PdfPreview, PdfPreviewProps } from './PdfPreview';
import { setup } from 'test-utils';

const PDF_SRC = '../test/test.pdf';

describe('Pdf Preview', () => {
	test('Render a pdf document', async () => {
		const onClose = jest.fn();
		setup(<PdfPreview show src={PDF_SRC} onClose={onClose} />);
		await screen.findByText(/loading pdf/i);
		await screen.findByText(/failed to load pdf file/i);
		expect(screen.getByTestId('pdf-preview-container')).toBeInTheDocument();
	});

	test('If show is false does not render the pdf', async () => {
		const onClose = jest.fn();
		setup(<PdfPreview show={false} src={PDF_SRC} onClose={onClose} />);
		expect(screen.queryByTestId('pdf-preview-container')).not.toBeInTheDocument();
	});

	test('Additional data are visible', async () => {
		const onClose = jest.fn();
		setup(
			<PdfPreview
				show
				src={PDF_SRC}
				onClose={onClose}
				filename="file name"
				extension="pdf"
				size="18KB"
			/>
		);
		await screen.findByText(/loading pdf/i);
		await screen.findByText(/failed to load pdf file/i);
		expect(screen.getByText(/file name/i)).toBeVisible();
		expect(screen.getByText(/pdf.*18KB/i)).toBeVisible();
	});

	test('Escape key close the preview', async () => {
		const onClose = jest.fn();
		const { user } = setup(<PdfPreview show src={PDF_SRC} onClose={onClose} />);
		await screen.findByText(/loading pdf/i);
		await screen.findByText(/failed to load pdf file/i);
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalled();
	});

	test('Click on actions calls onClose if event is not stopped by the action itself', async () => {
		const onClose = jest.fn();
		const actions: PdfPreviewProps['actions'] = [
			{
				id: 'action1',
				icon: 'Activity',
				onClick: jest.fn()
			},
			{
				id: 'action2',
				icon: 'People',
				onClick: jest.fn((e: React.SyntheticEvent) => {
					e.preventDefault();
				}),
				disabled: true
			}
		];

		const closeAction: PdfPreviewProps['closeAction'] = {
			id: 'closeAction',
			icon: 'Close',
			onClick: jest.fn((e: React.SyntheticEvent) => {
				e.preventDefault();
			})
		};
		const { user } = setup(
			<PdfPreview
				show
				src={PDF_SRC}
				onClose={onClose}
				actions={actions}
				filename="pdf name"
				closeAction={closeAction}
			/>
		);
		await screen.findByText(/loading pdf/i);
		await screen.findByText(/failed to load pdf file/i);
		const action1Item = screen.getByTestId('icon: Activity');
		const action2Item = screen.getByTestId('icon: People');
		const closeActionItem = screen.getByTestId('icon: Close');
		expect(action1Item).toBeVisible();
		expect(action2Item).toBeVisible();
		// eslint-disable-next-line testing-library/no-node-access
		expect(action2Item.parentElement).toHaveAttribute('disabled');
		expect(closeActionItem).toBeVisible();
		// click on action 1 is propagated and calls onClose
		await user.click(action1Item);
		expect(actions[0].onClick).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(1);
		// click on action 2 skips the handler of the action since it is disabled and calls onClose
		await user.click(action2Item);
		expect(actions[1].onClick).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(2);
		// click on close action is stopped by the action, event is not propagated and onClose is not called
		await user.click(closeActionItem);
		expect(closeAction.onClick).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(2);
		// click on filename is equivalent to a click on the overlay, so onClose is called
		await user.click(screen.getByText(/pdf name/i));
		expect(onClose).toHaveBeenCalledTimes(3);
	});
});
