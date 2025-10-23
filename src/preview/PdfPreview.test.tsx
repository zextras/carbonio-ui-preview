/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import * as React from 'react';

import { act, waitFor } from '@testing-library/react';

// Mock react-pdf with the manual mock from __mocks__ directory
vi.mock('react-pdf');

import { PdfPreview, PdfPreviewProps } from './PdfPreview.js';
import { ZOOM_STEPS } from '../constants/index.js';
import { KEYBOARD_KEY, SELECTORS } from '../tests/constants.js';
import { screen, loadPDF, setup, triggerObserver } from '../tests/utils.js';

const pdfFile = loadPDF('./__mocks__/_pdf.pdf');

const zoomInIcon = 'icon: Plus';
const zoomOutIcon = 'icon: Minus';
const zoomFitToWidthIcon = 'icon: MaximizeOutline';
const zoomResetWidthIcon = 'icon: MinimizeOutline';
const dataPageWidthAttribute = 'data-page-width';

async function waitForDocumentToLoad(): Promise<void> {
	const loadingElement = await screen.findByText(/Loading document preview…/i);
	await waitFor(() => expect(loadingElement).not.toBeInTheDocument());
}

describe('Pdf Preview', () => {
	test.each<'dataURI' | 'file' | 'blob'>(['dataURI', 'file', 'blob'])(
		'Render a pdf document from %s',
		async (src) => {
			const onClose = vi.fn();
			setup(<PdfPreview show src={pdfFile[src]} onClose={onClose} />);
			await waitForDocumentToLoad();
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector(SELECTORS.pdfPage(1))).toBeInTheDocument();
		}
	);

	it('should retrieve the pdf from a uri', async () => {
		const fetchFn = vi
			.spyOn(global, 'fetch')
			.mockImplementation(() => Promise.resolve(new Response(pdfFile.blob)));
		setup(<PdfPreview show src={'/test/url'} onClose={vi.fn()} />);
		await waitForDocumentToLoad();
		expect(fetchFn).toHaveBeenCalled();
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector(SELECTORS.pdfPage(1))).toBeInTheDocument();
	});

	test('If show is false does not render the pdf', async () => {
		const onClose = vi.fn();
		setup(<PdfPreview show={false} src={pdfFile.dataURI} onClose={onClose} />);
		expect(screen.queryByText(/Loading document preview…/i)).not.toBeInTheDocument();
		expect(screen.queryByTestId(SELECTORS.previewContainer)).not.toBeInTheDocument();
	});

	test('If pdf is not valid render an error message', async () => {
		vi.spyOn(global, 'fetch').mockReturnValue(Promise.reject(new Error('API is down')));
		const onClose = vi.fn();
		setup(<PdfPreview show src="invalid-pdf.pdf" onClose={onClose} />);
		expect(await screen.findByText(/Failed to load document preview./i)).toBeVisible();
		expect(screen.queryByText(/Loading document preview…/i)).not.toBeInTheDocument();
	});

	test('If fallback is requested, does not render the pdf but the fallback instead', async () => {
		const onClose = vi.fn();
		setup(
			<PdfPreview show src={pdfFile.dataURI} onClose={onClose} useFallback openSrc="open-src" />
		);
		expect(screen.getByText(/This item cannot be displayed/i)).toBeVisible();
		expect(
			screen.getByText(/The file size exceeds the limit allowed and cannot be displayed/i)
		).toBeVisible();
		expect(screen.getByText(/Please, download it or open it in a separate tab/i)).toBeVisible();
		expect(screen.getByRole('button', { name: /download/i })).toBeVisible();
		expect(screen.getByRole('button', { name: /open/i })).toBeVisible();
	});

	test('Render a custom fallback', async () => {
		const onClose = vi.fn();
		const CustomContent = <div>Custom content</div>;
		setup(
			<PdfPreview
				show
				src={pdfFile.dataURI}
				onClose={onClose}
				useFallback
				customContent={CustomContent}
				openSrc="open-src"
			/>
		);
		expect(screen.queryByText(/This item cannot be displayed/i)).not.toBeInTheDocument();
		expect(
			screen.queryByText(/The file size exceeds the limit allowed and cannot be displayed/i)
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Please, download it or open it in a separate tab/i)
		).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /open/i })).not.toBeInTheDocument();
		expect(screen.getByText(/custom content/i)).toBeVisible();
	});

	test('Additional data are visible', async () => {
		const onClose = vi.fn();
		setup(
			<PdfPreview
				show
				src={pdfFile.dataURI}
				onClose={onClose}
				filename="file name"
				extension="pdf"
				size="18KB"
			/>
		);
		await waitForDocumentToLoad();
		expect(screen.getByText(/file name/i)).toBeVisible();
		expect(screen.getByText(/pdf.*18KB/i)).toBeVisible();
	});

	test('Escape key close the preview', async () => {
		const onClose = vi.fn();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
		await waitForDocumentToLoad();
		await user.keyboard(KEYBOARD_KEY.ESC);
		expect(onClose).toHaveBeenCalled();
	});

	test('Close action calls onClose if no click action is provided', async () => {
		const onClose = vi.fn((e: React.SyntheticEvent | KeyboardEvent) => {
			e.preventDefault();
		});
		const closeAction: PdfPreviewProps['closeAction'] = {
			id: 'closeAction',
			icon: 'Activity',
			tooltipLabel: 'Custom close action'
		};
		const { user } = setup(
			<PdfPreview show src={pdfFile.dataURI} onClose={onClose} closeAction={closeAction} />
		);
		await waitForDocumentToLoad();
		const closeActionElement = screen.getByTestId('icon: Activity');
		expect(closeActionElement).toBeVisible();
		await user.hover(closeActionElement);
		await screen.findByText(/custom close action/i);
		await user.click(closeActionElement);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	test('Click on actions calls onClose if event is not stopped by the action itself, instead if is disabled it is not propagated anyway ', async () => {
		const onClose = vi.fn((ev: React.SyntheticEvent | KeyboardEvent) => {
			ev.preventDefault();
		});
		const actions: PdfPreviewProps['actions'] = [
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

		const closeAction: PdfPreviewProps['closeAction'] = {
			id: 'closeAction',
			icon: 'Close'
		};
		const { user } = setup(
			<PdfPreview
				show
				src={pdfFile.dataURI}
				onClose={onClose}
				actions={actions}
				filename="pdf name"
				closeAction={closeAction}
			/>
		);
		await waitForDocumentToLoad();
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
		// click on action 2 skips the handler of the action since it is disabled and does not call onClose
		await user.click(action2Item);
		expect(actions[1].onClick).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(1);
		// click on close action is the onClose itself
		await user.click(closeActionItem);
		expect(onClose).toHaveBeenCalledTimes(2);
		// click on filename is equivalent to a click on the overlay, so onClose is called
		await user.click(screen.getByText(/pdf name/i));
		expect(onClose).toHaveBeenCalledTimes(3);
	});

	test('Zoom starts at lowest step', async () => {
		const onClose = vi.fn();
		setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
		await waitForDocumentToLoad();
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${ZOOM_STEPS[0]}`
		);
	});

	test('Decrease zoom is disabled when zoom is at lowest point', async () => {
		const onClose = vi.fn();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
		await waitForDocumentToLoad();
		const zoomOutButton = screen.getByRoleWithIcon('button', { icon: zoomOutIcon });
		expect(zoomOutButton).toBeDisabled();
		const zoomInButton = screen.getByRoleWithIcon('button', { icon: zoomInIcon });
		expect(zoomInButton).toBeVisible();
		await user.click(zoomInButton);
		expect(zoomOutButton).toBeEnabled();
		await user.click(zoomOutButton);
		expect(zoomOutButton).toBeDisabled();
	});

	test('Increase and decrease zoom change zoom by 1 step per time', async () => {
		const onClose = vi.fn();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
		await waitForDocumentToLoad();
		expect(screen.getByTestId(zoomOutIcon)).toBeVisible();
		expect(screen.getByTestId(zoomInIcon)).toBeVisible();
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${ZOOM_STEPS[0]}`
		);
		for (let step = 0; step < ZOOM_STEPS.length - 1; step += 1) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(screen.getByTestId(zoomInIcon));
			expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
				dataPageWidthAttribute,
				`${ZOOM_STEPS[step + 1]}`
			);
		}
		for (let step = ZOOM_STEPS.length - 1; step > 0; step -= 1) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(screen.getByTestId(zoomOutIcon));
			expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
				dataPageWidthAttribute,
				`${ZOOM_STEPS[step - 1]}`
			);
		}
	});

	test('Increase zoom is disabled when zoom is at greatest point', async () => {
		const onClose = vi.fn();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
		await waitForDocumentToLoad();
		const zoomInButton = screen.getByRoleWithIcon('button', { icon: zoomInIcon });
		expect(zoomInButton).toBeVisible();
		expect(zoomInButton).toBeEnabled();
		for (let step = 0; step < ZOOM_STEPS.length - 1; step += 1) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(zoomInButton);
		}
		expect(zoomInButton).toBeDisabled();
	});

	test('Fit to width zoom set width of pdf to width of the window', async () => {
		const onClose = vi.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = 1000;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />);
		await waitForDocumentToLoad();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomResetWidthIcon)).not.toBeInTheDocument();
		expect(ref.current).not.toBeNull();
		vi.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${mockPdfWidth}`
		);
		expect(screen.getByTestId(zoomResetWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomFitToWidthIcon)).not.toBeInTheDocument();
	});

	test('Reset zoom set width to lowest step', async () => {
		const onClose = vi.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = 1000;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />);
		await waitForDocumentToLoad();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomResetWidthIcon)).not.toBeInTheDocument();
		expect(ref.current).not.toBeNull();
		vi.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${mockPdfWidth}`
		);
		expect(screen.getByTestId(zoomResetWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomFitToWidthIcon)).not.toBeInTheDocument();
		await user.click(screen.getByTestId(zoomResetWidthIcon));
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${ZOOM_STEPS[0]}`
		);
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomResetWidthIcon)).not.toBeInTheDocument();
	});

	test('When client width is lower than lowest zoom step and zoom is set to fit to width, decrease zoom is disabled and increase is enabled', async () => {
		const onClose = vi.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = ZOOM_STEPS[0] - 1;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />);
		await waitForDocumentToLoad();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		vi.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		const zoomOutButton = screen.getByRoleWithIcon('button', { icon: zoomOutIcon });
		expect(zoomOutButton).toBeDisabled();
		const zoomInButton = screen.getByRoleWithIcon('button', { icon: zoomInIcon });
		expect(zoomInButton).toBeEnabled();
	});

	test('When client width is greater than greatest zoom step and zoom is set to fit to width, decrease zoom is enabled and increase is disabled', async () => {
		const onClose = vi.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = ZOOM_STEPS[ZOOM_STEPS.length - 1] + 1;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />);
		await waitForDocumentToLoad();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		vi.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		const zoomInButton = screen.getByRoleWithIcon('button', { icon: zoomInIcon });
		expect(zoomInButton).toBeDisabled();
		const zoomOutButton = screen.getByRoleWithIcon('button', { icon: zoomOutIcon });
		expect(zoomOutButton).toBeEnabled();
	});

	test('After fit to width, decrease zoom set zoom to nearest lower zoom step', async () => {
		const onClose = vi.fn();
		const ref = React.createRef<HTMLDivElement>();
		// set client width to be between second and third steps
		const stepToReach = 1;
		const mockPdfWidth = ZOOM_STEPS[stepToReach + 1] - 1;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />);
		await waitForDocumentToLoad();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		vi.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		const zoomOutButton = screen.getByRoleWithIcon('button', { icon: zoomOutIcon });
		expect(zoomOutButton).toBeEnabled();
		await user.click(screen.getByTestId(zoomOutIcon));
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${ZOOM_STEPS[stepToReach]}`
		);
	});

	test('After fit to width, increase zoom set zoom to nearest greater zoom step', async () => {
		const onClose = vi.fn();
		const ref = React.createRef<HTMLDivElement>();
		// set client width to be between second and third steps
		const stepToReach = 2;
		const mockPdfWidth = ZOOM_STEPS[stepToReach - 1] + 1;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />);
		await waitForDocumentToLoad();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		vi.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		const zoomInButton = screen.getByRoleWithIcon('button', { icon: zoomInIcon });
		expect(zoomInButton).toBeEnabled();
		await user.click(screen.getByTestId(zoomInIcon));
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${ZOOM_STEPS[stepToReach]}`
		);
	});

	test('When fit to width is active, resize of the window update width of the pdf', async () => {
		const onClose = vi.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = [1001, 1501, 2001];
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />);
		await waitForDocumentToLoad();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		const getPreviewClientWidthMock = vi.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get');
		getPreviewClientWidthMock.mockReturnValueOnce(mockPdfWidth[0]);

		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${mockPdfWidth[0]}`
		);

		getPreviewClientWidthMock.mockReturnValueOnce(mockPdfWidth[1]);
		// resize window to trigger listener
		act(() => {
			window.resizeTo(mockPdfWidth[1], mockPdfWidth[1]);
		});
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${mockPdfWidth[1]}`
		);
	});

	test('Click on disabled decrease/increase zoom actions does not change step and does not close preview', async () => {
		const onClose = vi.fn();
		const ref = React.createRef<HTMLDivElement>();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />);
		await waitForDocumentToLoad();
		const zoomOutButton = screen.getByRoleWithIcon('button', { icon: zoomOutIcon });
		expect(zoomOutButton).toBeDisabled();
		await user.click(zoomOutButton);
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${ZOOM_STEPS[0]}`
		);
		expect(onClose).not.toHaveBeenCalled();
		vi.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(
			ZOOM_STEPS[ZOOM_STEPS.length - 1]
		);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${ZOOM_STEPS[ZOOM_STEPS.length - 1]}`
		);
		const zoomInButton = screen.getByRoleWithIcon('button', { icon: zoomInIcon });
		expect(zoomInButton).toBeDisabled();
		await user.click(zoomInButton);
		expect(screen.getAllByTestId(SELECTORS.pdfPageMock)[0]).toHaveAttribute(
			dataPageWidthAttribute,
			`${ZOOM_STEPS[ZOOM_STEPS.length - 1]}`
		);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('should not download the pdf if the fallback is shown', async () => {
		vi.useFakeTimers();
		const fetchFn = vi.spyOn(global, 'fetch');
		setup(
			<PdfPreview
				show
				src={'/test/url'}
				onClose={vi.fn()}
				useFallback
				contentLabel={'show fallback'}
			/>
		);
		expect(screen.getByText('show fallback')).toBeVisible();
		await vi.advanceTimersToNextTimerAsync();
		expect(fetchFn).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	describe('Page selector', () => {
		test('shows page controller', async () => {
			const onClose = vi.fn();
			setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			expect(screen.getByText(/page/i)).toBeVisible();
			expect(screen.getByRole('textbox', { name: /current page/i })).toBeVisible();
			// mock pdf has 4 pages
			expect(screen.getByText('4')).toBeVisible();
		});

		test('blur is a confirmation event on page input', async () => {
			const onClose = vi.fn();
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, '2');
			await user.tab();
			expect(pageInput).not.toHaveFocus();
			expect(pageInput).toHaveDisplayValue('2');
		});

		test('enter key is a confirmation event on page input', async () => {
			const onClose = vi.fn();
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, '2');
			await user.type(pageInput, KEYBOARD_KEY.ENTER);
			expect(pageInput).not.toHaveFocus();
			expect(pageInput).toHaveDisplayValue('2');
		});

		test('when input is confirmed, input loses focus and the document is scrolled to typed page', async () => {
			const onClose = vi.fn();
			const scrollIntoViewFn = vi.fn();
			window.HTMLElement.prototype.scrollIntoView = scrollIntoViewFn;
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, '2');
			await user.click(screen.getByText(/page/i));
			expect(pageInput).not.toHaveFocus();
			expect(pageInput).toHaveDisplayValue('2');
			expect(scrollIntoViewFn).toHaveBeenCalledTimes(1);
			expect(scrollIntoViewFn.mock.instances[0]).toHaveAttribute('data-page-number', '2');
		});

		test('when input is confirmed with an invalid value, input loses focus and the input value is reset to previous valid page', async () => {
			const onClose = vi.fn();
			const scrollIntoViewFn = vi.fn();
			window.HTMLElement.prototype.scrollIntoView = scrollIntoViewFn;
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, 'invalid');
			await user.click(screen.getByText(/page/i));
			expect(pageInput).not.toHaveFocus();
			expect(pageInput).toHaveDisplayValue('1');
			expect(scrollIntoViewFn).not.toHaveBeenCalled();
		});

		test('on scroll, if focus is not on input, value is updated with current page', async () => {
			const onClose = vi.fn();
			setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			// eslint-disable-next-line testing-library/no-node-access
			const page2Element = document.querySelector<HTMLElement>(SELECTORS.pdfPage(2));
			expect(page2Element).not.toBeNull();
			await triggerObserver(page2Element as HTMLElement);
			expect(pageInput).toHaveDisplayValue('2');
		});

		test('on scroll, if focus is on input, value is updated with current page', async () => {
			const onClose = vi.fn();
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, '4');
			expect(pageInput).toHaveFocus();
			// eslint-disable-next-line testing-library/no-node-access
			const page2Element = document.querySelector<HTMLElement>(SELECTORS.pdfPage(2));
			expect(page2Element).not.toBeNull();
			await triggerObserver(page2Element as HTMLElement);
			expect(pageInput).toHaveDisplayValue('2');
			expect(pageInput).toHaveFocus();
		});

		test('must press esc key 2 times to make user exit from the preview, when focus is on input', async () => {
			const onClose = vi.fn();
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			await user.click(pageInput);
			expect(pageInput).toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ESC);
			expect(onClose).not.toHaveBeenCalled();
			await user.keyboard(KEYBOARD_KEY.ESC);
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe('keyboard shortcuts', () => {
		describe('Home and End', () => {
			test('click End go to last page and Home return to the first page', async () => {
				const onClose = vi.fn();
				const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
				await waitForDocumentToLoad();
				const pageInput = screen.getByRole('textbox', { name: /current page/i });
				expect(pageInput).toHaveDisplayValue('1');
				await user.keyboard(KEYBOARD_KEY.END);
				expect(pageInput).toHaveDisplayValue('4');
				await user.keyboard(KEYBOARD_KEY.HOME);
				expect(pageInput).toHaveDisplayValue('1');
			});
			test('click End go to last page and Home return to the first page, but they do not work if the page input is focussed ', async () => {
				const onClose = vi.fn();
				const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
				await waitForDocumentToLoad();
				const pageInput = screen.getByRole('textbox', { name: /current page/i });
				expect(pageInput).toHaveDisplayValue('1');
				await user.click(pageInput);
				expect(pageInput).toHaveFocus();
				await user.keyboard(KEYBOARD_KEY.END);
				expect(pageInput).not.toHaveDisplayValue('4');
				expect(pageInput).toHaveDisplayValue('1');
				// remove focus
				await user.keyboard(KEYBOARD_KEY.ESC);
				expect(pageInput).not.toHaveFocus();
				await user.keyboard(KEYBOARD_KEY.END);
				expect(pageInput).toHaveDisplayValue('4');
				// focus input again
				await user.click(pageInput);
				expect(pageInput).toHaveFocus();
				await user.keyboard(KEYBOARD_KEY.HOME);
				expect(pageInput).not.toHaveDisplayValue('1');
				expect(pageInput).toHaveDisplayValue('4');
				// remove focus
				await user.keyboard(KEYBOARD_KEY.ESC);
				expect(pageInput).not.toHaveFocus();
				await user.keyboard(KEYBOARD_KEY.HOME);
				expect(pageInput).toHaveDisplayValue('1');
			});
		});

		describe('PageUp and PageDown', () => {
			test('click PageDown go to the next page and PageUp go to the previous page', async () => {
				const onClose = vi.fn();
				const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
				await waitForDocumentToLoad();
				const pageInput = screen.getByRole('textbox', { name: /current page/i });
				expect(pageInput).toHaveDisplayValue('1');
				await user.keyboard(KEYBOARD_KEY.PAGE_DOWN);
				expect(pageInput).toHaveDisplayValue('2');
				await user.keyboard(KEYBOARD_KEY.PAGE_DOWN);
				expect(pageInput).toHaveDisplayValue('3');
				await user.keyboard(KEYBOARD_KEY.PAGE_DOWN);
				expect(pageInput).toHaveDisplayValue('4');
				await user.keyboard(KEYBOARD_KEY.PAGE_DOWN);
				expect(pageInput).toHaveDisplayValue('4');
				await user.keyboard(KEYBOARD_KEY.PAGE_UP);
				expect(pageInput).toHaveDisplayValue('3');
				await user.keyboard(KEYBOARD_KEY.PAGE_UP);
				expect(pageInput).toHaveDisplayValue('2');
				await user.keyboard(KEYBOARD_KEY.PAGE_UP);
				expect(pageInput).toHaveDisplayValue('1');
				await user.keyboard(KEYBOARD_KEY.PAGE_UP);
				expect(pageInput).toHaveDisplayValue('1');
			});
			test('click PageDown go to the next page and PageUp go to the previous page, but they do not work if the page input is focussed ', async () => {
				const onClose = vi.fn();
				const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
				await waitForDocumentToLoad();
				const pageInput = screen.getByRole('textbox', { name: /current page/i });
				expect(pageInput).toHaveDisplayValue('1');
				await user.click(pageInput);
				expect(pageInput).toHaveFocus();
				await user.keyboard(KEYBOARD_KEY.PAGE_DOWN);
				expect(pageInput).not.toHaveDisplayValue('2');
				expect(pageInput).toHaveDisplayValue('1');
				// remove focus
				await user.keyboard(KEYBOARD_KEY.ESC);
				expect(pageInput).not.toHaveFocus();
				await user.keyboard(KEYBOARD_KEY.PAGE_DOWN);
				expect(pageInput).toHaveDisplayValue('2');
				// focus input again
				await user.click(pageInput);
				expect(pageInput).toHaveFocus();
				await user.keyboard(KEYBOARD_KEY.PAGE_UP);
				expect(pageInput).not.toHaveDisplayValue('1');
				expect(pageInput).toHaveDisplayValue('2');
				// remove focus
				await user.keyboard(KEYBOARD_KEY.ESC);
				expect(pageInput).not.toHaveFocus();
				await user.keyboard(KEYBOARD_KEY.PAGE_UP);
				expect(pageInput).toHaveDisplayValue('1');
			});
		});

		test('ArrowUp and ArrowDown', async () => {
			const onClose = vi.fn();
			const scrollByFn = vi.fn();
			window.HTMLElement.prototype.scrollBy = scrollByFn;
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />);
			await waitForDocumentToLoad();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.click(pageInput);
			expect(pageInput).toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ARROW_DOWN);
			expect(scrollByFn).not.toHaveBeenCalled();
			// remove focus
			await user.keyboard(KEYBOARD_KEY.ESC);
			expect(pageInput).not.toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ARROW_DOWN);
			expect(scrollByFn).toHaveBeenCalledTimes(1);
			expect(scrollByFn).toHaveBeenCalledWith(0, 40);
			await user.click(pageInput);
			expect(pageInput).toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ARROW_UP);
			expect(scrollByFn).toHaveBeenCalledTimes(1);
			// remove focus
			await user.keyboard(KEYBOARD_KEY.ESC);
			expect(pageInput).not.toHaveFocus();
			await user.keyboard(KEYBOARD_KEY.ARROW_UP);
			expect(scrollByFn).toHaveBeenCalledTimes(2);
			expect(scrollByFn).toHaveBeenCalledWith(0, -40);
		});
	});
});
