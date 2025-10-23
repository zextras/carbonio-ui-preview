/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import * as React from 'react';

import { fireEvent } from '@testing-library/react';

import { VideoPreview, VideoPreviewProps } from './VideoPreview.js';
import { KEYBOARD_KEY } from '../tests/constants.js';
import { screen, setup } from '../tests/utils.js';

describe('Video Preview', () => {
	const cannotBePlayedMessage = 'This video cannot be played.';

	test('Render a video', () => {
		const onClose = vi.fn();
		setup(<VideoPreview show src={'video'} onClose={onClose} />);
		expect(screen.getByTestId('video')).toBeVisible();
	});

	test('If show is false does not render the video', () => {
		const onClose = vi.fn();
		setup(<VideoPreview show={false} src={''} onClose={onClose} />);
		expect(screen.queryByTestId('video')).not.toBeInTheDocument();
	});

	test('Additional data are visible', () => {
		const onClose = vi.fn();
		setup(
			<VideoPreview
				show
				src={''}
				onClose={onClose}
				filename="video file name"
				extension="mp4"
				size="18MB"
			/>
		);
		expect(screen.getByText(/video file name/i)).toBeVisible();
		expect(screen.getByText(/mp4/i)).toBeVisible();
		expect(screen.getByText(/18MB/i)).toBeVisible();
	});

	test('Escape key close the preview', async () => {
		const onClose = vi.fn();
		const { user } = setup(<VideoPreview show src={''} onClose={onClose} />);
		await user.keyboard(KEYBOARD_KEY.ESC);
		expect(onClose).toHaveBeenCalled();
	});

	test('Click on actions calls onClose if event is not stopped by the action itself', async () => {
		const onClose = vi.fn<void, Parameters<VideoPreviewProps['onClose']>>((ev) => {
			ev.preventDefault();
		});
		const actions: VideoPreviewProps['actions'] = [
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

		const closeAction: VideoPreviewProps['closeAction'] = {
			id: 'closeAction',
			icon: 'Close'
		};
		const { user } = setup(
			<VideoPreview
				show
				src={''}
				onClose={onClose}
				actions={actions}
				filename="video name"
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
		await user.click(screen.getByText(/video name/i));
		expect(onClose).toHaveBeenCalledTimes(3);
	});

	it('should not render the video when canPlayType return empty string on mime type (mime type not supported)', () => {
		vi.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('');

		setup(
			<VideoPreview
				onClose={vi.fn()}
				show
				src={''}
				filename="video name"
				mimeType={'unsupported/mimeType'}
			/>
		);

		expect(screen.getByText(cannotBePlayedMessage)).toBeVisible();
		expect(screen.queryByTestId('video')).not.toBeInTheDocument();
	});

	it('should render the video when mime type props is not provided', () => {
		setup(<VideoPreview onClose={vi.fn()} show src={''} filename="video name" />);

		expect(screen.getByTestId('video')).toBeVisible();
		expect(screen.queryByText(cannotBePlayedMessage)).not.toBeInTheDocument();
	});

	it('should render the video when canPlayType return maybe string on mime type', () => {
		vi.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('maybe');
		const mimeType = 'video/mp4';
		setup(<VideoPreview onClose={vi.fn()} show src={''} mimeType={mimeType} />);
		expect(screen.getByTestId('video')).toBeVisible();
		expect(screen.queryByText(cannotBePlayedMessage)).not.toBeInTheDocument();
	});

	it('should render the video when canPlayType return probably string on mime type', () => {
		vi.spyOn(HTMLVideoElement.prototype, 'canPlayType').mockReturnValue('probably');
		const mimeType = 'video/mp4';
		setup(<VideoPreview onClose={vi.fn()} show src={''} mimeType={mimeType} />);
		expect(screen.getByTestId('video')).toBeVisible();
		expect(screen.queryByText(cannotBePlayedMessage)).not.toBeInTheDocument();
	});

	it('should render the fail string when video request fails', async () => {
		setup(<VideoPreview onClose={vi.fn()} show src={''} />);
		fireEvent.error(screen.getByTestId('video'));
		expect(await screen.findByText(cannotBePlayedMessage)).toBeVisible();
	});

	it('should call video play when keyboard space is clicked', async () => {
		vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(true);
		const playStub = vi.spyOn(window.HTMLVideoElement.prototype, 'play').mockImplementation();

		const pauseStub = vi.spyOn(window.HTMLVideoElement.prototype, 'pause').mockImplementation();

		const { user } = setup(<VideoPreview onClose={vi.fn()} show src={''} />);
		await user.keyboard(' ');
		expect(playStub).toHaveBeenCalled();
		expect(pauseStub).not.toHaveBeenCalled();
	});

	it('should call video pause when video is not paused and keyboard space is clicked', async () => {
		vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(false);
		const pauseStub = vi.spyOn(window.HTMLVideoElement.prototype, 'pause').mockImplementation();

		const playStub = vi.spyOn(window.HTMLVideoElement.prototype, 'play').mockImplementation();

		const { user } = setup(<VideoPreview onClose={vi.fn()} show src={''} />);
		await user.keyboard(' ');
		expect(pauseStub).toHaveBeenCalled();
		expect(playStub).not.toHaveBeenCalled();
	});
});
