/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PreviewNavigator } from './PreviewNavigator.js';
import { setup, screen } from '../tests/utils.js';

describe('PreviewNavigator', () => {
	describe('Previous/Next icon buttons', () => {
		it('render the "previous" button', () => {
			setup(<PreviewNavigator onClose={vi.fn()} show onPreviousPreview={vi.fn()} />);
			expect(screen.getByRoleWithIcon('button', { icon: 'icon: ArrowBackOutline' })).toBeVisible();
		});

		it('render the tooltip "Previous" when the user hovers on the previous button', async () => {
			const { user } = setup(
				<PreviewNavigator onClose={vi.fn()} show onPreviousPreview={vi.fn()} />
			);
			await user.hover(screen.getByRoleWithIcon('button', { icon: 'icon: ArrowBackOutline' }));
			expect(await screen.findByText(/previous/i)).toBeVisible();
		});

		it('render the "next" button', () => {
			setup(<PreviewNavigator onClose={vi.fn()} show onNextPreview={vi.fn()} />);
			expect(
				screen.getByRoleWithIcon('button', { icon: 'icon: ArrowForwardOutline' })
			).toBeVisible();
		});

		it('render the tooltip "Next" when the user hovers on the next button', async () => {
			const { user } = setup(
				<PreviewNavigator onClose={vi.fn()} show onNextPreview={vi.fn()} />
			);
			await user.hover(screen.getByRoleWithIcon('button', { icon: 'icon: ArrowForwardOutline' }));
			expect(await screen.findByText(/next/i)).toBeVisible();
		});
	});
});
