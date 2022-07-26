/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { screen } from '@testing-library/react';

import Header, { HeaderProps } from './Header';
import { setup } from 'test-utils';

describe('Header', () => {
	test('Render a header with all information', () => {
		const actions: HeaderProps['actions'] = [
			{
				id: 'action1',
				icon: 'ActivityOutline',
				onClick: jest.fn()
			}
		];
		const closeAction: HeaderProps['closeAction'] = {
			id: 'closeAction',
			icon: 'CloseOutline',
			onClick: jest.fn()
		};
		setup(
			<Header
				actions={actions}
				extension="ext"
				filename="some file name"
				size="85 GB"
				closeAction={closeAction}
			/>
		);

		expect(screen.getByText(/some file name/i)).toBeVisible();
		expect(screen.getByText(/ext/i)).toBeVisible();
		expect(screen.getByText(/85 GB/i)).toBeVisible();
		expect(screen.getByTestId('icon: ActivityOutline')).toBeVisible();
		expect(screen.getByTestId('icon: CloseOutline')).toBeVisible();
	});

	test('Tooltip is shown for actions when provided', async () => {
		const actions: HeaderProps['actions'] = [
			{
				id: 'action1',
				icon: 'ActivityOutline',
				onClick: jest.fn(),
				tooltipLabel: 'Activity One'
			},
			{
				id: 'action2',
				icon: 'PeopleOutline',
				onClick: jest.fn(),
				tooltipLabel: ''
			},
			{
				id: 'action3',
				icon: 'Airplane',
				onClick: jest.fn(),
				disabled: true,
				tooltipLabel: 'Airplane tooltip action'
			}
		];
		const closeAction: HeaderProps['closeAction'] = {
			id: 'closeAction',
			icon: 'CloseOutline',
			onClick: jest.fn(),
			tooltipLabel: 'Close'
		};

		const { user } = setup(
			<Header
				actions={actions}
				extension="ext"
				filename="some file name"
				size="85 GB"
				closeAction={closeAction}
			/>
		);

		const action1 = screen.getByTestId(`icon: ${actions[0].icon}`);
		const action2 = screen.getByTestId(`icon: ${actions[1].icon}`);
		const action3 = screen.getByTestId(`icon: ${actions[2].icon}`);
		const actionClose = screen.getByTestId(`icon: ${closeAction.icon}`);
		// register listeners
		jest.runOnlyPendingTimers();
		expect(screen.queryByText(/activity one/i)).not.toBeInTheDocument();
		// [@testing-library/user-event@14.3.0] hover is not triggered on parents anymore. See https://github.com/testing-library/user-event/issues/957
		// eslint-disable-next-line testing-library/no-node-access
		await user.hover(action1.parentElement as Element);
		await screen.findByText(/activity one/i);
		expect(screen.getByText(/activity one/i)).toBeVisible();
		// eslint-disable-next-line testing-library/no-node-access
		await user.hover(action2.parentElement as Element);
		expect(screen.queryByText(/activity one/i)).not.toBeInTheDocument();
		// eslint-disable-next-line testing-library/no-node-access
		await user.hover(action3.parentElement as Element);
		await screen.findByText(/airplane tooltip action/i);
		expect(screen.getByText(/airplane tooltip action/i)).toBeVisible();
		// eslint-disable-next-line testing-library/no-node-access
		await user.hover(actionClose.parentElement as Element);
		await screen.findByText(/close/i);
		expect(screen.queryByText(/airplane tooltip action/i)).not.toBeInTheDocument();
		expect(screen.getByText(/close/i)).toBeVisible();
	});
});
