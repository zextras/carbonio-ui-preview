/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';

import { useCombinedRefs, getColor, useTheme } from '@zextras/carbonio-design-system';
import type { DocumentProps, PageProps } from 'react-pdf';
import { Document, Page } from 'react-pdf';

import 'react-pdf/dist/Page/TextLayer.css';
import './AnnotationLayer.css';
import { HeaderAction } from './Header.js';
import { usePageScrollController } from './hooks/usePageScrollController.js';
import { useZoom } from './hooks/useZoom.js';
import { Navigator } from './Navigator.js';
import { PageController } from './PageController.js';
import styles from './PdfPreview.module.css';
import {
	PreviewCriteriaAlternativeContent,
	PreviewCriteriaAlternativeContentProps
} from './PreviewCriteriaAlternativeContent.js';
import { PreviewNavigator, PreviewNavigatorProps } from './PreviewNavigator.js';
import { ZoomController } from './ZoomController.js';
import { SCROLL_STEP } from '../constants/index.js';
import { print } from '../utils/utils.js';

type Page = Parameters<NonNullable<PageProps['onLoadSuccess']>>[0];

export interface PdfPreviewProps
	extends
		Omit<PreviewNavigatorProps, 'onOverlayClick'>,
		Omit<PreviewCriteriaAlternativeContentProps, 'downloadSrc'> {
	/** Preview source */
	src: string | File | Blob | ArrayBuffer;
	/** Whether force cache */
	forceCache?: boolean;
	/** Use fallback content if you don't want to view the pdf for some reason; content can be customizable with customContent */
	useFallback?: boolean;
	/** Custom component for the fallback */
	customContent?: React.ReactElement;
	/** Whether a text layer should be rendered */
	renderTextLayer?: boolean;
	/** Whether the annotation layer should be rendered */
	renderAnnotationLayer?: boolean;
	/** Label for the zoom out action */
	zoomOutLabel?: string;
	/** Label shown when the zoom is at its minimum */
	lowerLimitReachedLabel?: string;
	/** Label for the reset zoom action */
	resetZoomLabel?: string;
	/** Label for the fit to width zoom action */
	fitToWidthLabel?: string;
	/** Label for the zoom in action */
	zoomInLabel?: string;
	/** Label shown when the zoom is at its maximum */
	upperLimitReachedLabel?: string;
	/** Label for the page controller */
	pageLabel?: string;
	/** Label shown when the preview cannot be shown */
	errorLabel?: string;
	/** Label shown while the preview is loading */
	loadingLabel?: string;
	/** Label for the print action */
	printActionTooltipLabel?: string;
}

/** Main component for the preview of a pdf */
export const PdfPreview = React.forwardRef<HTMLDivElement, PdfPreviewProps>(function PreviewFn(
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
		renderTextLayer = true,
		renderAnnotationLayer = true,
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
		loadingLabel = 'Loading document preview…',
		printActionTooltipLabel = 'Print',
		previousTooltip,
		nextTooltip
	},
	ref
) {
	const [documentFile, setDocumentFile] = useState<ArrayBuffer | Blob | string | null>(null);
	const [fetchFailed, setFetchFailed] = useState(false);

	useEffect(() => {
		if (useFallback) {
			return (): void => undefined;
		}
		// Check whether is a string but not a data URI.
		if (typeof src === 'string' && !src.startsWith('data:') && src.trim().length > 0) {
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
		return (): void => undefined;
	}, [src, setDocumentFile, forceCache, useFallback]);

	const previewRef: React.MutableRefObject<HTMLDivElement | null> = useCombinedRefs(ref);
	const documentLoaded = useRef(useFallback);
	const pageRefs = useRef<React.RefObject<HTMLElement>[]>([]);
	const pdfPageProxyListRef = useRef<Record<number, Page>>({});

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
			setPrintReady(Object.values(pdfPageProxyListRef.current).length === numPages);
		},
		[numPages, registerPageObserver]
	);

	const pageOnLoadSuccess = useCallback<NonNullable<PageProps['onLoadSuccess']>>((page) => {
		pdfPageProxyListRef.current[page._pageIndex] = page;
	}, []);

	const pageElements = useMemo(() => {
		if (numPages) {
			pageRefs.current = [];
			return [...Array(numPages)].map((el, index) => {
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
			switch (event.key) {
				case 'Home':
					if (currentPage > 1) {
						onPageChange(1);
					}
					break;
				case 'End':
					if (numPages && currentPage < numPages) {
						onPageChange(numPages);
					}
					break;
				case 'PageUp':
					if (currentPage > 1) {
						onPageChange(currentPage - 1);
					}
					break;
				case 'PageDown':
					if (numPages && currentPage < numPages) {
						onPageChange(currentPage + 1);
					}
					break;
				case 'ArrowUp':
					previewRef.current?.scrollBy(0, -SCROLL_STEP);
					break;
				case 'ArrowDown':
					previewRef.current?.scrollBy(0, SCROLL_STEP);
					break;
				default:
					break;
			}
		},
		[currentPage, numPages, onPageChange, previewRef]
	);

	useEffect(() => {
		if (show) {
			document.addEventListener('keydown', eventListener);
		}

		return (): void => {
			document.removeEventListener('keydown', eventListener);
		};
	}, [eventListener, show]);

	const printWithOpen = useCallback<HeaderAction['onClick']>(
		(e) => {
			e.stopPropagation();
			if (documentFile) {
				if (typeof documentFile === 'string') {
					fetch(documentFile)
						.then((res) => res.blob())
						.then((file) => print(file));
				} else {
					print(documentFile);
				}
			}
		},
		[documentFile]
	);

	const printAction = useMemo<HeaderAction>(
		() => ({
			tooltipLabel: printActionTooltipLabel,
			icon: 'PrinterOutline',
			onClick: printWithOpen,
			id: 'print-open',
			disabled: !printReady
		}),
		[printActionTooltipLabel, printReady, printWithOpen]
	);
	const actions = useMemo(() => [printAction, ...actionsProp], [actionsProp, printAction]);

	const theme = useTheme();

	return (
		<PreviewNavigator
			onPreviousPreview={onPreviousPreview}
			onNextPreview={onNextPreview}
			container={container}
			disablePortal={disablePortal}
			extension={extension}
			show={show}
			filename={filename}
			actions={actions}
			size={size}
			onOverlayClick={onOverlayClick}
			closeAction={closeAction}
			onClose={onClose}
			previousTooltip={previousTooltip}
			nextTooltip={nextTooltip}
		>
			<>
				{!$customContent && (
					<Navigator>
						<PageController
							pageLabel={pageLabel}
							pagesNumber={numPages ?? 0}
							currentPage={currentPage}
							onPageChange={onPageChange}
						/>
						<div
							style={{ '--vertical-divider-background-color': getColor('gray6', theme) }}
							className={styles.verticalDivider}
						/>
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
				<div
					ref={previewRef}
					data-testid="pdf-preview-container"
					className={styles.previewContainer}
					style={{ '--scrollbar-thumb-color': theme.palette.gray3.regular }}
				>
					{$customContent ||
						(src && (
							<Document
								className={styles.document}
								file={documentFile}
								onLoadSuccess={onDocumentLoadSuccess}
								onLoadError={onDocumentLoadError}
								onLoadProgress={onDocumentLoadProgress}
								error={<p className={styles.message}>{errorLabel}</p>}
								loading={<p className={styles.message}>{loadingLabel}</p>}
								noData={
									<p className={styles.message}>{(fetchFailed && errorLabel) || loadingLabel}</p>
								}
							>
								{pageElements}
							</Document>
						))}
				</div>
			</>
		</PreviewNavigator>
	);
});
