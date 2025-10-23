/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import * as React from 'react';

import { faker } from '@faker-js/faker';

import { ImagePreview, ImagePreviewProps } from './ImagePreview.js';
import { KEYBOARD_KEY } from '../tests/constants.js';
import { setup, screen } from '../tests/utils.js';

describe('Image Preview', () => {
	test('Render an image', () => {
		const img = faker.image.url();
		const onClose = vi.fn();
		setup(<ImagePreview show src={img} onClose={onClose} />);
		expect(screen.getByRole('presentation')).toBeVisible();
	});

	test('If show is false does not render an image', () => {
		const img = faker.image.url();
		const onClose = vi.fn();
		setup(<ImagePreview show={false} src={img} onClose={onClose} />);
		expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
	});

	test('Additional data are visible', () => {
		const img = faker.image.url();
		const onClose = vi.fn();
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
		const img = faker.image.url();
		const onClose = vi.fn();
		const { user } = setup(<ImagePreview show src={img} onClose={onClose} />);
		await user.keyboard(KEYBOARD_KEY.ESC);
		expect(onClose).toHaveBeenCalled();
	});

	test('Click on actions calls onClose if event is not stopped by the action itself', async () => {
		const img = faker.image.url();
		const onClose = vi.fn<void, Parameters<ImagePreviewProps['onClose']>>((ev) => {
			ev.preventDefault();
		});
		const actions: ImagePreviewProps['actions'] = [
			{
				id: 'action1',
				icon: 'Activity',
				onClick: vi.fn()
			},
			{
				id: 'action2',
				icon: 'People',
				onClick: vi.fn((ev: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
					ev.preventDefault();
				}),
				disabled: true
			}
		];

		const closeAction: ImagePreviewProps['closeAction'] = {
			id: 'closeAction',
			icon: 'Close'
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
		const action1Item = screen.getByRoleWithIcon('button', { icon: 'icon: Activity' });
		const action2Item = screen.getByRoleWithIcon('button', { icon: 'icon: People' });
		const closeActionItem = screen.getByRoleWithIcon('button', { icon: 'icon: Close' });
		expect(action1Item).toBeVisible();
		expect(action2Item).toBeVisible();
		expect(action2Item).toBeDisabled();
		expect(closeActionItem).toBeVisible();
		// click on action 1 is propagated and calls onClose
		await user.click(action1Item);
		expect(actions[0].onClick).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(1);
		// click on action 2 skips the handler of the action since it is disabled and calls onClose
		await user.click(action2Item);
		expect(actions[1].onClick).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(1);
		// click on close action is the onClose itself
		await user.click(closeActionItem);
		expect(onClose).toHaveBeenCalledTimes(2);
		// click on filename is equivalent to a click on the overlay, so onClose is called
		await user.click(screen.getByText(/image name/i));
		expect(onClose).toHaveBeenCalledTimes(3);
	});
});
