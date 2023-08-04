/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export function print(documentFile: ArrayBuffer | Blob): void {
	const documentUrl = URL.createObjectURL(
		(documentFile instanceof Blob && documentFile) || new Blob([documentFile])
	);
	const printWin = window.open(documentUrl, '');
	if (printWin) {
		printWin.onload = (): void => {
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 1000);
		};
	}
}
