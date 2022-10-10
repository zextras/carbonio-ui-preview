/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ZOOM_STEPS } from './constants';
import { PdfPreview, PdfPreviewProps } from './PdfPreview';
import { loadPDF, setup, triggerObserver } from 'test-utils';

const pdfFile = loadPDF('./__mocks__/_pdf.pdf');

const zoomInIcon = 'icon: Plus';
const zoomOutIcon = 'icon: Minus';
const zoomFitToWidthIcon = 'icon: MaximizeOutline';
const zoomResetWidthIcon = 'icon: MinimizeOutline';

jest.useRealTimers();

describe('Pdf Preview', () => {
	test('Render a pdf document', async () => {
		const onClose = jest.fn();
		setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		expect(screen.queryByText(/Loading document preview…/i)).not.toBeInTheDocument();
		expect(screen.getByTestId('pdf-preview-container')).toBeInTheDocument();
		// eslint-disable-next-line testing-library/no-node-access
		const pageElement = document.querySelector('[data-page-number="1"]');
		expect(pageElement).toBeDefined();
		expect(pageElement).not.toBeNull();
		expect(pageElement).toBeInTheDocument();
	});

	test('If show is false does not render the pdf', async () => {
		const onClose = jest.fn();
		setup(<PdfPreview show={false} src={pdfFile.dataURI} onClose={onClose} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		expect(screen.queryByText(/Loading document preview…/i)).not.toBeInTheDocument();
		expect(screen.queryByTestId('pdf-preview-container')).not.toBeInTheDocument();
	});

	test('If pdf is not valid render an error message', async () => {
		const onClose = jest.fn();
		setup(<PdfPreview show src="invalid-pdf.pdf" onClose={onClose} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		await screen.findByText(/Failed to load document preview./i);
		expect(screen.queryByText(/Loading document preview…/i)).not.toBeInTheDocument();
		expect(screen.getByTestId('pdf-preview-container')).toBeInTheDocument();
	});

	test('If fallback is requested, does not render the pdf but the fallback instead', async () => {
		const onClose = jest.fn();
		setup(
			<PdfPreview show src={pdfFile.dataURI} onClose={onClose} useFallback openSrc="open-src" />,
			{
				setupOptions: { advanceTimers: () => Promise.resolve() }
			}
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
		const onClose = jest.fn();
		const CustomContent = <div>Custom content</div>;
		setup(
			<PdfPreview
				show
				src={pdfFile.dataURI}
				onClose={onClose}
				useFallback
				customContent={CustomContent}
				openSrc="open-src"
			/>,
			{
				setupOptions: { advanceTimers: () => Promise.resolve() }
			}
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
		const onClose = jest.fn();
		setup(
			<PdfPreview
				show
				src={pdfFile.dataURI}
				onClose={onClose}
				filename="file name"
				extension="pdf"
				size="18KB"
			/>,
			{
				setupOptions: { advanceTimers: () => Promise.resolve() }
			}
		);
		await screen.findByText(/Loading document preview…/i);
		expect(screen.queryByText(/Loading document preview…/i)).not.toBeInTheDocument();
		expect(screen.getByText(/file name/i)).toBeVisible();
		expect(screen.getByText(/pdf.*18KB/i)).toBeVisible();
	});

	test('Escape key close the preview', async () => {
		const onClose = jest.fn();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		expect(screen.queryByText(/Loading document preview…/i)).not.toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalled();
	});

	test('Close action calls onClose if no click action is provided', async () => {
		const onClose = jest.fn((e: React.SyntheticEvent | KeyboardEvent) => {
			e.preventDefault();
		});
		const closeAction: PdfPreviewProps['closeAction'] = {
			id: 'closeAction',
			icon: 'Activity',
			tooltipLabel: 'Custom close action'
		};
		const { user } = setup(
			<PdfPreview show src={pdfFile.dataURI} onClose={onClose} closeAction={closeAction} />,
			{
				setupOptions: { advanceTimers: () => Promise.resolve() }
			}
		);
		await screen.findByText(/Loading document preview…/i);
		expect(screen.queryByText(/Loading document preview…/i)).not.toBeInTheDocument();
		const closeActionElement = screen.getByTestId('icon: Activity');
		expect(closeActionElement).toBeVisible();
		await user.hover(closeActionElement);
		await screen.findByText(/custom close action/i);
		await user.click(closeActionElement);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	test('Click on actions calls onClose if event is not stopped by the action itself, instead if is disabled it is not propagated anyway ', async () => {
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
				onClick: jest.fn((ev: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
					ev.preventDefault();
				}),
				disabled: true
			}
		];

		const closeAction: PdfPreviewProps['closeAction'] = {
			id: 'closeAction',
			icon: 'Close',
			onClick: jest.fn((ev: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
				ev.preventDefault();
			})
		};
		const { user } = setup(
			<PdfPreview
				show
				src={pdfFile.dataURI}
				onClose={onClose}
				actions={actions}
				filename="pdf name"
				closeAction={closeAction}
			/>,
			{
				setupOptions: { advanceTimers: () => Promise.resolve() }
			}
		);
		await screen.findByText(/Loading document preview…/i);
		await waitFor(() =>
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('[data-page-number="1"]')).toBeInTheDocument()
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
		// click on action 2 skips the handler of the action since it is disabled and does not call onClose
		await user.click(action2Item);
		expect(actions[1].onClick).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(1);
		// click on close action is stopped by the action, event is not propagated and onClose is not called
		await user.click(closeActionItem);
		// FIXME
		// expect(closeAction.onClick).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(3);
		// click on filename is equivalent to a click on the overlay, so onClose is called
		await user.click(screen.getByText(/pdf name/i));
		expect(onClose).toHaveBeenCalledTimes(4);
	});

	test('Zoom starts at lowest step', async () => {
		const onClose = jest.fn();
		setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		const canvas = document.querySelector('canvas');
		expect(canvas).toBeVisible();
		expect(canvas).toHaveAttribute('width', `${ZOOM_STEPS[0]}`);
	});

	test('Decrease zoom is disabled when zoom is at lowest point', async () => {
		const onClose = jest.fn();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		const canvas = document.querySelector('canvas');
		expect(canvas).toBeVisible();
		expect(canvas).toHaveAttribute('width', `${ZOOM_STEPS[0]}`);
		expect(screen.getByTestId(zoomOutIcon)).toBeVisible();
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomOutIcon).parentElement).toHaveAttribute('disabled', '');
		expect(screen.getByTestId(zoomInIcon)).toBeVisible();
		await user.click(screen.getByTestId(zoomInIcon));
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomOutIcon).parentElement).not.toHaveAttribute('disabled', '');
		await userEvent.click(screen.getByTestId(zoomOutIcon));
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomOutIcon).parentElement).toHaveAttribute('disabled', '');
	});

	test('Increase and decrease zoom change zoom by 1 step per time', async () => {
		const onClose = jest.fn();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomOutIcon)).toBeVisible();
		expect(screen.getByTestId(zoomInIcon)).toBeVisible();
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${ZOOM_STEPS[0]}`);
		for (let step = 0; step < ZOOM_STEPS.length - 1; step += 1) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(screen.getByTestId(zoomInIcon));
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toHaveAttribute('width', `${ZOOM_STEPS[step + 1]}`);
		}
		for (let step = ZOOM_STEPS.length - 1; step > 0; step -= 1) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(screen.getByTestId(zoomOutIcon));
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toHaveAttribute('width', `${ZOOM_STEPS[step - 1]}`);
		}
	});

	test('Increase zoom is disabled when zoom is at greatest point', async () => {
		const onClose = jest.fn();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomInIcon)).toBeVisible();
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomInIcon).parentElement).not.toHaveAttribute('disabled', '');
		for (let step = 0; step < ZOOM_STEPS.length - 1; step += 1) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(screen.getByTestId(zoomInIcon));
		}
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomInIcon).parentElement).toHaveAttribute('disabled', '');
	});

	test('Fit to width zoom set width of pdf to width of the window', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = 1000;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomResetWidthIcon)).not.toBeInTheDocument();
		expect(ref.current).not.toBeNull();
		jest.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${mockPdfWidth}`);
		expect(screen.getByTestId(zoomResetWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomFitToWidthIcon)).not.toBeInTheDocument();
	});

	test('Reset zoom set width to lowest step', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = 1000;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomResetWidthIcon)).not.toBeInTheDocument();
		expect(ref.current).not.toBeNull();
		jest.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${mockPdfWidth}`);
		expect(screen.getByTestId(zoomResetWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomFitToWidthIcon)).not.toBeInTheDocument();
		await user.click(screen.getByTestId(zoomResetWidthIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${ZOOM_STEPS[0]}`);
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		expect(screen.queryByTestId(zoomResetWidthIcon)).not.toBeInTheDocument();
	});

	test('When client width is lower than lowest zoom step and zoom is set to fit to width, decrease zoom is disabled and increase is enabled', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = ZOOM_STEPS[0] - 1;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		jest.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomOutIcon).parentElement).toHaveAttribute('disabled', '');
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomInIcon).parentElement).not.toHaveAttribute('disabled', '');
	});

	test('When client width is greater than greatest zoom step and zoom is set to fit to width, decrease zoom is enabled and increase is disabled', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = ZOOM_STEPS[ZOOM_STEPS.length - 1] + 1;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		jest.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomInIcon).parentElement).toHaveAttribute('disabled', '');
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomOutIcon).parentElement).not.toHaveAttribute('disabled', '');
	});

	test('After fit to width, decrease zoom set zoom to nearest lower zoom step', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<HTMLDivElement>();
		// set client width to be between second and third steps
		const stepToReach = 1;
		const mockPdfWidth = ZOOM_STEPS[stepToReach + 1] - 1;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		jest.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomOutIcon).parentElement).not.toHaveAttribute('disabled', '');
		await user.click(screen.getByTestId(zoomOutIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${ZOOM_STEPS[stepToReach]}`);
	});

	test('After fit to width, increase zoom set zoom to nearest greater zoom step', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<HTMLDivElement>();
		// set client width to be between second and third steps
		const stepToReach = 2;
		const mockPdfWidth = ZOOM_STEPS[stepToReach - 1] + 1;
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		jest.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get').mockReturnValue(mockPdfWidth);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomInIcon).parentElement).not.toHaveAttribute('disabled', '');
		await user.click(screen.getByTestId(zoomInIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${ZOOM_STEPS[stepToReach]}`);
	});

	test('When fit to width is active, resize of the window update width of the pdf', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<HTMLDivElement>();
		const mockPdfWidth = [1001, 1501, 2001];
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		expect(screen.getByTestId(zoomFitToWidthIcon)).toBeVisible();
		const getPreviewClientWidthMock = jest.spyOn(
			ref.current as HTMLDivElement,
			'clientWidth',
			'get'
		);
		getPreviewClientWidthMock.mockReturnValueOnce(mockPdfWidth[0]);

		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${mockPdfWidth[0]}`);

		getPreviewClientWidthMock.mockReturnValueOnce(mockPdfWidth[1]);
		// resize window to trigger listener
		act(() => {
			window.resizeTo(mockPdfWidth[1], mockPdfWidth[1]);
		});
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${mockPdfWidth[1]}`);
	});

	test('Click on disabled decrease/increase zoom actions does not change step and does not close preview', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<HTMLDivElement>();
		const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} ref={ref} />, {
			setupOptions: { advanceTimers: () => Promise.resolve() }
		});
		await screen.findByText(/Loading document preview…/i);
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toBeVisible();
		// eslint-disable-next-line jest-dom/prefer-enabled-disabled,testing-library/no-node-access
		expect(screen.getByTestId(zoomOutIcon).parentElement).toHaveAttribute('disabled', '');
		await user.click(screen.getByTestId(zoomOutIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute('width', `${ZOOM_STEPS[0]}`);
		expect(onClose).not.toHaveBeenCalled();
		jest
			.spyOn(ref.current as HTMLDivElement, 'clientWidth', 'get')
			.mockReturnValue(ZOOM_STEPS[ZOOM_STEPS.length - 1]);
		await user.click(screen.getByTestId(zoomFitToWidthIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute(
			'width',
			`${ZOOM_STEPS[ZOOM_STEPS.length - 1]}`
		);
		// eslint-disable-next-line testing-library/no-node-access,jest-dom/prefer-enabled-disabled
		expect(screen.getByTestId(zoomInIcon).parentElement).toHaveAttribute('disabled', '');
		await user.click(screen.getByTestId(zoomInIcon));
		// eslint-disable-next-line testing-library/no-node-access
		expect(document.querySelector('canvas')).toHaveAttribute(
			'width',
			`${ZOOM_STEPS[ZOOM_STEPS.length - 1]}`
		);
		expect(onClose).not.toHaveBeenCalled();
	});

	describe('Page selector', () => {
		test('shows page controller', async () => {
			const onClose = jest.fn();
			setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
			expect(screen.getByRole('textbox', { name: /current page/i })).toBeVisible();
			// mock pdf has 4 pages
			expect(screen.getByText('4')).toBeVisible();
		});

		test('blur is a confirmation event on page input', async () => {
			const onClose = jest.fn();
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, '2');
			await user.tab();
			expect(pageInput).not.toHaveFocus();
			expect(pageInput).toHaveDisplayValue('2');
		});

		test('enter key is a confirmation event on page input', async () => {
			const onClose = jest.fn();
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, '2');
			await user.type(pageInput, '{Enter}');
			expect(pageInput).not.toHaveFocus();
			expect(pageInput).toHaveDisplayValue('2');
		});

		test('when input is confirmed, input loses focus and the document is scrolled to typed page', async () => {
			const onClose = jest.fn();
			const scrollIntoViewFn = jest.fn();
			window.HTMLElement.prototype.scrollIntoView = scrollIntoViewFn;
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
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
			const onClose = jest.fn();
			const scrollIntoViewFn = jest.fn();
			window.HTMLElement.prototype.scrollIntoView = scrollIntoViewFn;
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
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
			const onClose = jest.fn();
			setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			// eslint-disable-next-line testing-library/no-node-access
			const page2Element = document.querySelector<HTMLElement>('[data-page-number="2"]');
			expect(page2Element).not.toBeNull();
			await triggerObserver(page2Element as HTMLElement);
			expect(pageInput).toHaveDisplayValue('2');
		});

		test('on scroll, if focus is on input, value is updated with current page', async () => {
			const onClose = jest.fn();
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, '4');
			expect(pageInput).toHaveFocus();
			// eslint-disable-next-line testing-library/no-node-access
			const page2Element = document.querySelector<HTMLElement>('[data-page-number="2"]');
			expect(page2Element).not.toBeNull();
			await triggerObserver(page2Element as HTMLElement);
			expect(pageInput).toHaveDisplayValue('2');
			expect(pageInput).toHaveFocus();
		});

		test('must press esc key 2 times to make user exit from the preview, when focus is on input', async () => {
			const onClose = jest.fn();
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.clear(pageInput);
			await user.type(pageInput, '4');
			expect(pageInput).toHaveFocus();
			await user.keyboard('{Escape}');
			expect(onClose).not.toHaveBeenCalled();
			await user.keyboard('{Escape}');
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe('keyboard shortcuts', () => {
		describe('Home and End', () => {
			test('click End go to last page and Home return to the first page', async () => {
				const onClose = jest.fn();
				const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
					setupOptions: { advanceTimers: () => Promise.resolve() }
				});
				await screen.findByText(/Loading document preview…/i);
				// eslint-disable-next-line testing-library/no-node-access
				expect(document.querySelector('canvas')).toBeVisible();
				expect(screen.getByText(/page/i)).toBeVisible();
				const pageInput = screen.getByRole('textbox', { name: /current page/i });
				expect(pageInput).toHaveDisplayValue('1');
				await user.keyboard('{End}');
				expect(pageInput).toHaveDisplayValue('4');
				await user.keyboard('{Home}');
				expect(pageInput).toHaveDisplayValue('1');
			});
			test('click End go to last page and Home return to the first page, but they do not work if the page input is focussed ', async () => {
				const onClose = jest.fn();
				const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
					setupOptions: { advanceTimers: () => Promise.resolve() }
				});
				await screen.findByText(/Loading document preview…/i);
				// eslint-disable-next-line testing-library/no-node-access
				expect(document.querySelector('canvas')).toBeVisible();
				expect(screen.getByText(/page/i)).toBeVisible();
				const pageInput = screen.getByRole('textbox', { name: /current page/i });
				expect(pageInput).toHaveDisplayValue('1');
				await user.click(pageInput);
				expect(pageInput).toHaveFocus();
				await user.keyboard('{End}');
				expect(pageInput).not.toHaveDisplayValue('4');
				expect(pageInput).toHaveDisplayValue('1');
				// remove focus
				await user.keyboard('{Escape}');
				expect(pageInput).not.toHaveFocus();
				await user.keyboard('{End}');
				expect(pageInput).toHaveDisplayValue('4');
				// focus input again
				await user.click(pageInput);
				expect(pageInput).toHaveFocus();
				await user.keyboard('{Home}');
				expect(pageInput).not.toHaveDisplayValue('1');
				expect(pageInput).toHaveDisplayValue('4');
				// remove focus
				await user.keyboard('{Escape}');
				expect(pageInput).not.toHaveFocus();
				await user.keyboard('{Home}');
				expect(pageInput).toHaveDisplayValue('1');
			});
		});

		describe('PageUp and PageDown', () => {
			test('click PageDown go to the next page and PageUp go to the previous page', async () => {
				const onClose = jest.fn();
				const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
					setupOptions: { advanceTimers: () => Promise.resolve() }
				});
				await screen.findByText(/Loading document preview…/i);
				// eslint-disable-next-line testing-library/no-node-access
				expect(document.querySelector('canvas')).toBeVisible();
				expect(screen.getByText(/page/i)).toBeVisible();
				const pageInput = screen.getByRole('textbox', { name: /current page/i });
				expect(pageInput).toHaveDisplayValue('1');
				await user.keyboard('{PageDown}');
				expect(pageInput).toHaveDisplayValue('2');
				await user.keyboard('{PageDown}');
				expect(pageInput).toHaveDisplayValue('3');
				await user.keyboard('{PageDown}');
				expect(pageInput).toHaveDisplayValue('4');
				await user.keyboard('{PageDown}');
				expect(pageInput).toHaveDisplayValue('4');
				await user.keyboard('{PageUp}');
				expect(pageInput).toHaveDisplayValue('3');
				await user.keyboard('{PageUp}');
				expect(pageInput).toHaveDisplayValue('2');
				await user.keyboard('{PageUp}');
				expect(pageInput).toHaveDisplayValue('1');
				await user.keyboard('{PageUp}');
				expect(pageInput).toHaveDisplayValue('1');
			});
			test('click PageDown go to the next page and PageUp go to the previous page, but they do not work if the page input is focussed ', async () => {
				const onClose = jest.fn();
				const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
					setupOptions: { advanceTimers: () => Promise.resolve() }
				});
				await screen.findByText(/Loading document preview…/i);
				// eslint-disable-next-line testing-library/no-node-access
				expect(document.querySelector('canvas')).toBeVisible();
				expect(screen.getByText(/page/i)).toBeVisible();
				const pageInput = screen.getByRole('textbox', { name: /current page/i });
				expect(pageInput).toHaveDisplayValue('1');
				await user.click(pageInput);
				expect(pageInput).toHaveFocus();
				await user.keyboard('{PageDown}');
				expect(pageInput).not.toHaveDisplayValue('2');
				expect(pageInput).toHaveDisplayValue('1');
				// remove focus
				await user.keyboard('{Escape}');
				expect(pageInput).not.toHaveFocus();
				await user.keyboard('{PageDown}');
				expect(pageInput).toHaveDisplayValue('2');
				// focus input again
				await user.click(pageInput);
				expect(pageInput).toHaveFocus();
				await user.keyboard('{PageUp}');
				expect(pageInput).not.toHaveDisplayValue('1');
				expect(pageInput).toHaveDisplayValue('2');
				// remove focus
				await user.keyboard('{Escape}');
				expect(pageInput).not.toHaveFocus();
				await user.keyboard('{PageUp}');
				expect(pageInput).toHaveDisplayValue('1');
			});
		});

		test('ArrowUp and ArrowDown', async () => {
			const onClose = jest.fn();
			const scrollByFn = jest.fn();
			window.HTMLElement.prototype.scrollBy = scrollByFn;
			const { user } = setup(<PdfPreview show src={pdfFile.dataURI} onClose={onClose} />, {
				setupOptions: { advanceTimers: () => Promise.resolve() }
			});
			await screen.findByText(/Loading document preview…/i);
			// eslint-disable-next-line testing-library/no-node-access
			expect(document.querySelector('canvas')).toBeVisible();
			expect(screen.getByText(/page/i)).toBeVisible();
			const pageInput = screen.getByRole('textbox', { name: /current page/i });
			expect(pageInput).toHaveDisplayValue('1');
			await user.click(pageInput);
			expect(pageInput).toHaveFocus();
			await user.keyboard('{ArrowDown}');
			expect(scrollByFn).not.toHaveBeenCalled();
			// remove focus
			await user.keyboard('{Escape}');
			expect(pageInput).not.toHaveFocus();
			await user.keyboard('{ArrowDown}');
			expect(scrollByFn).toHaveBeenCalledTimes(1);
			expect(scrollByFn).toHaveBeenCalledWith(0, 40);
			await user.click(pageInput);
			expect(pageInput).toHaveFocus();
			await user.keyboard('{ArrowUp}');
			expect(scrollByFn).toHaveBeenCalledTimes(1);
			// remove focus
			await user.keyboard('{Escape}');
			expect(pageInput).not.toHaveFocus();
			await user.keyboard('{ArrowUp}');
			expect(scrollByFn).toHaveBeenCalledTimes(2);
			expect(scrollByFn).toHaveBeenCalledWith(0, -40);
		});
	});
});
