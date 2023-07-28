/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Container, Portal, useCombinedRefs, getColor } from '@zextras/carbonio-design-system';
import { size as lodashSize } from 'lodash';
import map from 'lodash/map';
import noop from 'lodash/noop';
import type { DocumentProps, PDFPageProxy, PageProps } from 'react-pdf';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack5';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import styled from 'styled-components';

import FocusWithin from './FocusWithin';
import Header, { HeaderAction, HeaderProps } from './Header';
import { Navigator } from './Navigator';
import { PageController } from './PageController';
import {
	PreviewCriteriaAlternativeContent,
	PreviewCriteriaAlternativeContentProps
} from './PreviewCriteriaAlternativeContent';
import { AbsoluteLeftIconButton, AbsoluteRightIconButton } from './StyledComponents';
import { usePageScrollController } from './usePageScrollController';
import { useZoom } from './useZoom';
import { ZoomController } from './ZoomController';
import { type MakeOptional } from '../utils/type-utils';
import { print } from '../utils/utils';

const Overlay = styled.div`
	height: 100vh;
	max-height: 100vh;
	width: 100%;
	max-width: 100%;
	position: fixed;
	top: 0;
	left: 0;
	background-color: rgba(0, 0, 0, 0.8);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1003;
`;

const MiddleContainer = styled(Container)`
	flex-grow: 1;
`;

const ExternalContainer = styled.div`
	height: 100vh;
	max-height: 100vh;
	width: 100vw;
	max-width: 100vw;
	display: flex;
	flex-direction: column;
	position: relative;
`;

const PreviewContainer = styled.div`
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	//  https://bhch.github.io/posts/2021/04/centring-flex-items-and-allowing-overflow-scroll/
	//justify-content: center;
	//align-items: center;
	// justify-content and align-items conflict with overflow management
	overflow: auto;
	outline: none;

	&::-webkit-scrollbar {
		width: 7px;
		height: 7px;
	}

	&::-webkit-scrollbar-track {
		background-color: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background-color: ${({ theme }): string => theme.palette.gray3.regular};
		border-radius: 0.25rem;
	}

	& > .react-pdf__Document {
		padding-bottom: 1rem;
		margin: auto;
		display: flex;
		gap: 1rem;
		flex-direction: column;
	}

	& .react-pdf__message {
		color: white;
	}
`;

const VerticalDivider = styled.div<{ $color: string }>`
	width: 0.0625rem;
	height: 1.5rem;
	background-color: ${({ $color, theme }): string => getColor($color, theme)};
	flex: 0 0 0.0625rem;
`;

type PdfPreviewProps = Partial<Omit<HeaderProps, 'closeAction'>> & {
	/** Left Action for the preview */
	closeAction?: MakeOptional<HeaderAction, 'onClick'>;
	/**
	 * HTML node where to insert the Portal's children.
	 * The default value is 'window.top.document'.
	 * */
	container?: Element;
	/** Flag to disable the Portal implementation */
	disablePortal?: boolean;
	/** Flag to show or hide Portal's content */
	show: boolean;
	/** preview source */
	src: string | File | Blob | ArrayBuffer;
	/** Whether force cache */
	forceCache?: boolean;
	/** Callback to hide the preview */
	onClose: (e: React.SyntheticEvent | KeyboardEvent) => void;
	/** use fallback content if you don't want to view the pdf for some reason; content can be customizable with customContent */
	useFallback?: boolean;
	/** CustomContent */
	customContent?: React.ReactElement;
	/** Whether a text layer should be rendered */
	renderTextLayer?: boolean;
	/** Whether the annotation layer should be rendered */
	renderAnnotationLayer?: boolean;
	zoomOutLabel?: string;
	lowerLimitReachedLabel?: string;
	resetZoomLabel?: string;
	fitToWidthLabel?: string;
	zoomInLabel?: string;
	upperLimitReachedLabel?: string;
	/** Callback  */
	onNextPreview?: (e: React.SyntheticEvent | KeyboardEvent) => void;
	/** Callback  */
	onPreviousPreview?: (e: React.SyntheticEvent | KeyboardEvent) => void;
	pageLabel?: string;
	errorLabel?: string;
	loadingLabel?: string;
} & Omit<PreviewCriteriaAlternativeContentProps, 'downloadSrc'>;

const A4_300DPI_PX_WIDTH = 2480;
const A4_300DPI_PX_HEIGHT = 3508;
const PdfPreview = React.forwardRef<HTMLDivElement, PdfPreviewProps>(function PreviewFn(
	{
		src,
		forceCache = true,
		show,
		container,
		disablePortal,
		extension = '',
		filename = '',
		size = '',
		actions: actionsProp = [],
		closeAction,
		onClose,
		useFallback = false,
		customContent,
		renderTextLayer = false,
		renderAnnotationLayer = false,
		openSrc,
		titleLabel,
		contentLabel,
		downloadLabel,
		openLabel,
		noteLabel,
		zoomOutLabel,
		fitToWidthLabel,
		lowerLimitReachedLabel,
		resetZoomLabel,
		upperLimitReachedLabel,
		zoomInLabel,
		onNextPreview,
		onPreviousPreview,
		pageLabel,
		errorLabel = 'Failed to load document preview.',
		loadingLabel = 'Loading document preview…'
	},
	ref
) {
	const [documentFile, setDocumentFile] = useState<ArrayBuffer | Blob | string | null>(null);
	const [fetchFailed, setFetchFailed] = useState(false);

	useEffect(() => {
		// Check whether is a string but not a data URI.
		if (typeof src === 'string' && !src.startsWith('data:')) {
			const controller = new AbortController();
			fetch(src, { signal: controller.signal, cache: forceCache ? 'force-cache' : undefined })
				.then((res) => res.blob())
				.then((file) => setDocumentFile(file))
				.catch(() => {
					setFetchFailed(true);
				});

			return (): void => controller.abort();
		}
		// ArrayBuffer - File - Blob - data URI string
		setDocumentFile(src);
		return noop;
	}, [src, setDocumentFile, forceCache]);

	const previewRef: React.MutableRefObject<HTMLDivElement | null> = useCombinedRefs(ref);
	const documentLoaded = useRef(useFallback);
	const pageRefs = useRef<React.RefObject<HTMLElement>[]>([]);
	const pdfPageProxyListRef = useRef<{ [pageIndex: number]: PDFPageProxy }>({});

	const [numPages, setNumPages] = useState<number | null>(null);
	const [currentPage, setCurrentPage] = useState<number>(0);
	const {
		currentZoom,
		incrementable,
		decrementable,
		increaseOfOneStep,
		decreaseOfOneStep,
		fitToWidth,
		fitToWidthActive,
		reset
	} = useZoom(previewRef);

	const updatePageOnScroll = useCallback((pageElement: Element | undefined) => {
		if (pageElement) {
			const currentPageIndex = pageRefs.current?.findIndex(
				(pageRef) => pageRef.current === pageElement
			);
			if (currentPageIndex > -1) {
				setCurrentPage(currentPageIndex + 1);
			}
		}
	}, []);

	const { observePage } = usePageScrollController(previewRef, updatePageOnScroll);

	const $closeAction = useMemo(() => {
		if (closeAction) {
			return {
				...closeAction,
				onClick: onClose
			};
		}
		return closeAction;
	}, [closeAction, onClose]);

	const onOverlayClick = useCallback<React.ReactEventHandler>(
		(event) => {
			event.stopPropagation();
			// close preview on click on overlay only if document is loaded (both success or error)
			documentLoaded.current &&
				previewRef.current &&
				!event.isDefaultPrevented() &&
				(previewRef.current === event.target ||
					!previewRef.current.contains(event.target as Node)) &&
				onClose(event);
		},
		[onClose, previewRef]
	);

	useEffect(() => {
		if (!show) {
			reset();
		}
	}, [reset, show]);

	const resetWidth = useCallback(
		(ev: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
			ev.stopPropagation();
			reset();
		},
		[reset]
	);

	const registerPageObserver = useCallback<NonNullable<PageProps['onRenderSuccess']>>(
		({ pageNumber }): void => {
			const pageRef = pageRefs.current[pageNumber - 1];
			if (pageRef.current) {
				observePage(pageRef.current);
			}
		},
		[observePage]
	);

	const [printReady, setPrintReady] = useState(false);

	const pageOnRenderSuccess = useCallback<NonNullable<PageProps['onRenderSuccess']>>(
		(page): void => {
			registerPageObserver(page);
			setPrintReady(lodashSize(pdfPageProxyListRef.current) === numPages);
		},
		[numPages, registerPageObserver]
	);

	const pageOnLoadSuccess = useCallback<NonNullable<PageProps['onLoadSuccess']>>((page) => {
		pdfPageProxyListRef.current[page._pageIndex] = page;
	}, []);

	const pageElements = useMemo(() => {
		if (numPages) {
			pageRefs.current = [];
			return map(new Array(numPages), (el, index) => {
				const pageRef = React.createRef<HTMLDivElement>();
				pageRefs.current.push(pageRef);
				return (
					<Page
						key={`page_${index + 1}`}
						pageNumber={index + 1}
						onRenderSuccess={pageOnRenderSuccess}
						onLoadSuccess={pageOnLoadSuccess}
						width={currentZoom}
						renderTextLayer={renderTextLayer}
						renderAnnotationLayer={renderAnnotationLayer}
						inputRef={pageRef}
					/>
				);
			});
		}
		return [];
	}, [
		currentZoom,
		numPages,
		pageOnLoadSuccess,
		pageOnRenderSuccess,
		renderAnnotationLayer,
		renderTextLayer
	]);

	const onDocumentLoadSuccess = useCallback<NonNullable<DocumentProps['onLoadSuccess']>>(
		(document) => {
			setNumPages(document.numPages);
			setCurrentPage(1);
			documentLoaded.current = true;
		},
		[]
	);

	const onDocumentLoadError = useCallback<NonNullable<DocumentProps['onLoadError']>>((error) => {
		console.error(error);
		documentLoaded.current = true;
	}, []);

	const onDocumentLoadProgress = useCallback<NonNullable<DocumentProps['onLoadProgress']>>(() => {
		documentLoaded.current = false;
	}, []);

	const $customContent = useMemo(() => {
		if (useFallback) {
			return (
				customContent ?? (
					<PreviewCriteriaAlternativeContent
						downloadSrc={
							(typeof src === 'string' && src) ||
							((src instanceof File || src instanceof Blob) && URL.createObjectURL(src)) ||
							URL.createObjectURL(new Blob([src], { type: 'application/pdf' }))
						}
						openSrc={openSrc}
						contentLabel={contentLabel}
						downloadLabel={downloadLabel}
						noteLabel={noteLabel}
						openLabel={openLabel}
						titleLabel={titleLabel}
						filename={filename}
					/>
				)
			);
		}
		return undefined;
	}, [
		useFallback,
		customContent,
		src,
		openSrc,
		contentLabel,
		downloadLabel,
		noteLabel,
		openLabel,
		titleLabel,
		filename
	]);

	const onPageChange = useCallback((newPage: number) => {
		setCurrentPage(newPage);
		pageRefs.current[newPage - 1].current?.scrollIntoView();
	}, []);

	const eventListener = useCallback<(e: KeyboardEvent) => void>(
		(event) => {
			if (event.key === 'Escape') {
				onClose(event);
			} else if (event.key === 'ArrowRight' && onNextPreview) {
				onNextPreview(event);
			} else if (event.key === 'ArrowLeft' && onPreviousPreview) {
				onPreviousPreview(event);
			} else if (event.key === 'Home') {
				if (currentPage > 1) {
					onPageChange(1);
				}
			} else if (event.key === 'End') {
				if (numPages && currentPage < numPages) {
					onPageChange(numPages);
				}
			} else if (event.key === 'PageUp') {
				if (currentPage > 1) {
					onPageChange(currentPage - 1);
				}
			} else if (event.key === 'PageDown') {
				if (numPages && currentPage < numPages) {
					onPageChange(currentPage + 1);
				}
			} else if (event.key === 'ArrowUp') {
				previewRef.current?.scrollBy(0, -40);
			} else if (event.key === 'ArrowDown') {
				previewRef.current?.scrollBy(0, 40);
			}
		},
		[currentPage, numPages, onClose, onNextPreview, onPageChange, onPreviousPreview, previewRef]
	);

	useEffect(() => {
		if (show) {
			document.addEventListener('keydown', eventListener);
		}

		return (): void => {
			document.removeEventListener('keydown', eventListener);
		};
	}, [eventListener, show]);

	const buildHtmlDocument = useCallback(
		(content: string) => `
			<!DOCTYPE html>
			<html lang="">
				<head>
					<title>${filename}</title>
					<style media="print" type="text/css">
						@media print {
							html {
								margin: 0;
							}
							img {
								page-break-after: always;
								page-break-inside: avoid;
							}
							.page-portrait {
								width: ${A4_300DPI_PX_WIDTH};
								height: ${A4_300DPI_PX_HEIGHT};
							}
							.page-landscape {
								width: ${A4_300DPI_PX_HEIGHT};
								height: ${A4_300DPI_PX_WIDTH};
							}
							@page {
								size: auto;
								margin: 0;
							}
						}
					</style>
				</head>
				<body>${content}</body>
			</html>
			`,
		[filename]
	);

	const printWithIFrame = useCallback(() => {
		if (documentFile) {
			const documentUrl =
				(typeof documentFile === 'string' && documentFile) ||
				URL.createObjectURL((documentFile instanceof Blob && documentFile) || new Blob());
			const iframe = document.createElement('iframe');
			iframe.style.display = 'none';
			iframe.src = documentUrl;
			document.body.appendChild(iframe);
			iframe.onload = (): void => {
				setTimeout(() => {
					try {
						if (iframe.contentWindow) {
							iframe.contentWindow.focus();
							setTimeout(() => {
								if (iframe.contentWindow) {
									iframe.contentWindow.print();
								}
							}, 1000);
						}
					} catch (e) {
						console.error('error while printing from iframe', e);
					}
				}, 1000);
			};
		}
	}, [documentFile]);

	const printCanvas = useCallback(() => {
		function isPortraitCanvas(canvas: HTMLCanvasElement): boolean {
			return canvas.width <= canvas.height;
		}
		const printWin = window.open('', '');
		if (printWin) {
			const canvasElements = document.querySelectorAll<HTMLCanvasElement>('canvas');
			if (canvasElements.length > 0) {
				printWin.document.open();
				printWin.document.write(buildHtmlDocument(''));
				printWin.document.close();

				const firstPageIsPortrait = isPortraitCanvas(canvasElements[0]);
				canvasElements.forEach((canvas, index) => {
					const page = pdfPageProxyListRef.current[index];
					const isPortrait = isPortraitCanvas(canvas);
					const rotation =
						isPortrait === firstPageIsPortrait ? page.rotate : (page.rotate + 90) % 360;
					const imgContainer = printWin.document.createElement('div');
					imgContainer.classList.add(isPortrait ? 'page-portrait' : 'page-landscape');
					imgContainer.classList.add(`rotate-${rotation}`);
					const imgElement = printWin.document.createElement('img');
					imgElement.src = canvas.toDataURL();
					imgContainer.appendChild(imgElement);
					printWin.document.body.appendChild(imgContainer);
				});
				printWin.focus();
				printWin.print();
			}
			// printWin.close();
		}
	}, [buildHtmlDocument]);

	const printWithOpen = useCallback<HeaderAction['onClick']>(
		(e) => {
			e.stopPropagation();
			if (documentFile) {
				print(documentFile);
			}
		},
		[documentFile]
	);

	const printActions = useMemo<HeaderAction[]>(
		() => [
			{
				tooltipLabel: 'Print with iframe',
				icon: 'PrinterOutline',
				onClick: printWithIFrame,
				id: 'print-iframe',
				disabled: !printReady
			},
			{
				tooltipLabel: 'Print with canvas',
				icon: 'PrinterOutline',
				onClick: printCanvas,
				id: 'print-canvas',
				disabled: !printReady
			},
			{
				tooltipLabel: 'Print with open',
				icon: 'PrinterOutline',
				onClick: printWithOpen,
				id: 'print-open',
				disabled: !printReady
			}
		],
		[printWithIFrame, printReady, printCanvas, printWithOpen]
	);
	const actions = useMemo(() => [...actionsProp, ...printActions], [actionsProp, printActions]);

	return (
		<Portal show={show} disablePortal={disablePortal} container={container}>
			<Overlay onClick={onOverlayClick}>
				<FocusWithin>
					<ExternalContainer>
						{!$customContent && (
							<Navigator>
								<PageController
									pageLabel={pageLabel}
									pagesNumber={numPages ?? 0}
									currentPage={currentPage}
									onPageChange={onPageChange}
								/>
								<VerticalDivider $color="gray6" />
								<ZoomController
									decrementable={decrementable}
									zoomOutLabel={zoomOutLabel}
									lowerLimitReachedLabel={lowerLimitReachedLabel}
									decreaseByStep={decreaseOfOneStep}
									fitToWidthActive={fitToWidthActive}
									resetZoomLabel={resetZoomLabel}
									fitToWidthLabel={fitToWidthLabel}
									resetWidth={resetWidth}
									fitToWidth={fitToWidth}
									incrementable={incrementable}
									zoomInLabel={zoomInLabel}
									upperLimitReachedLabel={upperLimitReachedLabel}
									increaseByStep={increaseOfOneStep}
								/>
							</Navigator>
						)}
						<Header
							actions={actions}
							filename={filename}
							extension={extension}
							size={size}
							closeAction={$closeAction}
						/>
						<MiddleContainer orientation="horizontal" crossAlignment="unset" minHeight={0}>
							{onPreviousPreview && (
								<AbsoluteLeftIconButton
									icon="ArrowBackOutline"
									size="medium"
									backgroundColor="gray0"
									iconColor="gray6"
									borderRadius="round"
									onClick={onPreviousPreview}
								/>
							)}
							<PreviewContainer ref={previewRef} data-testid="pdf-preview-container">
								{$customContent ||
									(src && (
										<Document
											file={documentFile}
											onLoadSuccess={onDocumentLoadSuccess}
											onLoadError={onDocumentLoadError}
											onLoadProgress={onDocumentLoadProgress}
											error={errorLabel}
											loading={loadingLabel}
											noData={(fetchFailed && errorLabel) || loadingLabel}
										>
											{pageElements}
										</Document>
									))}
							</PreviewContainer>
							{onNextPreview && (
								<AbsoluteRightIconButton
									icon="ArrowForwardOutline"
									size="medium"
									backgroundColor="gray0"
									iconColor="gray6"
									borderRadius="round"
									onClick={onNextPreview}
								/>
							)}
						</MiddleContainer>
					</ExternalContainer>
				</FocusWithin>
			</Overlay>
		</Portal>
	);
});

export { PdfPreview, PdfPreviewProps };
