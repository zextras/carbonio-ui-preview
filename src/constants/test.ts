/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export const SELECTORS = {
	previewContainer: 'pdf-preview-container',
	pdfPage(pageNum: number): string {
		return `[data-page-number="${pageNum}"]`;
	}
} as const;

export const KEYBOARD_KEY = {
	PAGE_DOWN: '{PageDown}',
	PAGE_UP: '{PageUp}',
	END: '{End}',
	HOME: '{Home}',
	ESC: '{Escape}',
	ARROW_DOWN: '{ArrowDown}',
	ARROW_UP: '{ArrowUp}',
	ARROW_RIGHT: '{ArrowRight}',
	ARROW_LEFT: '{ArrowLeft}',
	ENTER: '{Enter}'
} as const;
