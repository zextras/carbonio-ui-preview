/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { faker } from '@faker-js/faker';
import { screen } from '@testing-library/react';

import { ImagePreview, ImagePreviewProps } from './ImagePreview';
import { setup } from 'test-utils';

describe('Image Preview', () => {
	test('Render an image', () => {
		const img = faker.image.image();
		const onClose = jest.fn();
		setup(<ImagePreview show src={img} onClose={onClose} />);
		expect(screen.getByRole('img')).toBeVisible();
	});

	test('If show is false does not render an image', () => {
		const img = faker.image.image();
		const onClose = jest.fn();
		setup(<ImagePreview show={false} src={img} onClose={onClose} />);
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	test('Additional data are visible', () => {
		const img = faker.image.image();
		const onClose = jest.fn();
		setup(
			<ImagePreview
				show
				src={img}
				onClose={onClose}
				filename="image file name"
				alt="this is an image"
				extension="png"
				size="18KB"
			/>
		);
		expect(screen.getByText(/image file name/i)).toBeVisible();
		expect(screen.queryByText(/this is an image/i)).not.toBeInTheDocument();
		expect(screen.getByAltText(/this is an image/i)).toBeVisible();
		expect(screen.getByText(/png/i)).toBeVisible();
		expect(screen.getByText(/18KB/i)).toBeVisible();
	});

	test('Escape key close the preview', async () => {
		const img = faker.image.image();
		const onClose = jest.fn();
		const { user } = setup(<ImagePreview show src={img} onClose={onClose} />);
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalled();
	});

	test('Click on actions calls onClose if event is not stopped by the action itself', async () => {
		const img = faker.image.image();
		const onClose = jest.fn();
		const actions: ImagePreviewProps['actions'] = [
			{
				id: 'action1',
				icon: 'Activity',
				onClick: jest.fn()
			},
			{
				id: 'action2',
				icon: 'People',
				onClick: jest.fn((e: React.SyntheticEvent) => {
					e.stopPropagation();
				}),
				disabled: true
			}
		];

		const closeAction: ImagePreviewProps['closeAction'] = {
			id: 'closeAction',
			icon: 'Close',
			onClick: jest.fn((e: React.SyntheticEvent) => {
				e.stopPropagation();
			})
		};
		const { user } = setup(
			<ImagePreview
				show
				src={img}
				onClose={onClose}
				actions={actions}
				filename="image name"
				closeAction={closeAction}
			/>
		);
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
		await user.click(screen.getByText(/image name/i));
		expect(onClose).toHaveBeenCalledTimes(3);
	});
});
