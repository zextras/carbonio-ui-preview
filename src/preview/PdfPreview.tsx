/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
	Container,
	IconButton,
	Portal,
	Padding,
	useCombinedRefs,
	getColor
} from '@zextras/carbonio-design-system';
import map from 'lodash/map';
import type { DocumentProps } from 'react-pdf';
import { PageProps } from 'react-pdf';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import styled from 'styled-components';

import { MakeOptional } from '../utils/utils';
import FocusWithin from './FocusWithin';
import Header, { HeaderAction, HeaderProps } from './Header';
import { Navigator } from './Navigator';
import { PageController } from './PageController';
import {
	PreviewCriteriaAlternativeContent,
	PreviewCriteriaAlternativeContentProps
} from './PreviewCriteriaAlternativeContent';
import { AbsoluteLeftContainer, AbsoluteRightContainer } from './StyledComponents';
import { usePageScrollController } from './usePageScrollController';
import { useZoom } from './useZoom';
import { ZoomController } from './ZoomController';

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
		border-radius: 4px;
	}

	& > .react-pdf__Document {
		//padding-right: 17px;
		padding-bottom: 16px;
		margin: auto;
		display: flex;
		gap: 16px;
		flex-direction: column;
	}

	& .react-pdf__message {
		color: white;
	}
`;

const VerticalDivider = styled.div<{ $color: string }>`
	width: 1px;
	height: 24px;
	background-color: ${({ $color, theme }): string => getColor($color, theme)};
	flex: 0 0 1px;
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
	/** preview img source */
	src: string;
	/** Callback to hide the preview */
	onClose: (e: React.SyntheticEvent | KeyboardEvent) => void;
	/** use fallback content if you don't want to view the pdf for some reason; content can be customizable with customContent */
	useFallback?: boolean;
	/** CustomContent */
	customContent?: React.ReactElement;
	/** Whether a text layer should be rendered */
	renderTextLayer?: boolean;
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
} & Omit<PreviewCriteriaAlternativeContentProps, 'downloadSrc'>;

const PdfPreview = React.forwardRef<HTMLDivElement, PdfPreviewProps>(function PreviewFn(
	{
		src,
		show,
		container,
		disablePortal,
		extension = '',
		filename = '',
		size = '',
		actions = [],
		closeAction,
		onClose,
		useFallback = false,
		customContent,
		renderTextLayer = false,
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
		pageLabel
	},
	ref
) {
	const previewRef: React.MutableRefObject<HTMLDivElement | null> = useCombinedRefs(ref);
	const documentLoaded = useRef(useFallback);
	const pageRefs = useRef<React.RefObject<HTMLElement>[]>([]);

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

	const escapeEvent = useCallback<(e: KeyboardEvent) => void>(
		(event) => {
			if (event.key === 'Escape') {
				onClose(event);
			}
		},
		[onClose]
	);

	useEffect(() => {
		if (show) {
			document.addEventListener('keyup', escapeEvent);
		}

		return (): void => {
			document.removeEventListener('keyup', escapeEvent);
		};
	}, [escapeEvent, show]);

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
						onRenderSuccess={registerPageObserver}
						width={currentZoom}
						renderTextLayer={renderTextLayer}
						inputRef={pageRef}
					/>
				);
			});
		}
		return [];
	}, [currentZoom, numPages, registerPageObserver, renderTextLayer]);

	const onDocumentLoadSuccess = useCallback<NonNullable<DocumentProps['onLoadSuccess']>>(
		(document) => {
			setNumPages(document.numPages);
			setCurrentPage(1);
			documentLoaded.current = true;
		},
		[]
	);

	const onDocumentLoadError = useCallback<NonNullable<DocumentProps['onLoadError']>>(() => {
		documentLoaded.current = true;
	}, []);

	const onDocumentLoadProgress = useCallback<NonNullable<DocumentProps['onLoadProgress']>>(() => {
		documentLoaded.current = false;
	}, []);

	const file = useMemo(() => ({ url: src }), [src]);

	const $customContent = useMemo(() => {
		if (useFallback) {
			return (
				customContent || (
					<PreviewCriteriaAlternativeContent
						downloadSrc={src}
						openSrc={openSrc}
						contentLabel={contentLabel}
						downloadLabel={downloadLabel}
						noteLabel={noteLabel}
						openLabel={openLabel}
						titleLabel={titleLabel}
					/>
				)
			);
		}
		return undefined;
	}, [
		customContent,
		openSrc,
		src,
		useFallback,
		contentLabel,
		downloadLabel,
		noteLabel,
		openLabel,
		titleLabel
	]);

	const onPageChange = useCallback((newPage: number) => {
		setCurrentPage(newPage);
		pageRefs.current[newPage - 1].current?.scrollIntoView();
	}, []);

	return (
		<Portal show={show} disablePortal={disablePortal} container={container}>
			<Overlay onClick={onOverlayClick}>
				<FocusWithin>
					<ExternalContainer>
						{!$customContent && (
							<Navigator>
								<PageController
									pageLabel={pageLabel}
									pagesNumber={numPages || 0}
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
								<AbsoluteLeftContainer width="fit">
									<Padding left="small" right="small">
										<IconButton
											icon="ArrowBackOutline"
											size="medium"
											backgroundColor="gray0"
											iconColor="gray6"
											borderRadius="round"
											onClick={onPreviousPreview}
										/>
									</Padding>
								</AbsoluteLeftContainer>
							)}
							<PreviewContainer ref={previewRef} data-testid="pdf-preview-container">
								{$customContent || (
									<Document
										file={file}
										onLoadSuccess={onDocumentLoadSuccess}
										onLoadError={onDocumentLoadError}
										onLoadProgress={onDocumentLoadProgress}
									>
										{pageElements}
									</Document>
								)}
							</PreviewContainer>
							{onNextPreview && (
								<AbsoluteRightContainer width="fit">
									<Padding left="small" right="small">
										<IconButton
											icon="ArrowForwardOutline"
											size="medium"
											backgroundColor="gray0"
											iconColor="gray6"
											borderRadius="round"
											onClick={onNextPreview}
										/>
									</Padding>
								</AbsoluteRightContainer>
							)}
						</MiddleContainer>
					</ExternalContainer>
				</FocusWithin>
			</Overlay>
		</Portal>
	);
});

export { PdfPreview, PdfPreviewProps };
