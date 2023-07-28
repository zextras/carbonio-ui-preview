/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export function print(documentFile: string | ArrayBuffer | Blob): void {
	const documentUrl =
		(typeof documentFile === 'string' && documentFile) ||
		URL.createObjectURL((documentFile instanceof Blob && documentFile) || new Blob());
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
