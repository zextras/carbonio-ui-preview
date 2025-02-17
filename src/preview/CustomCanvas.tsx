/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { usePageContext, pdfjs } from 'react-pdf';

function cancelRunningTask(runningTask?: { cancel?: () => void } | null): void {
	if (runningTask?.cancel) runningTask.cancel();
}

type PageCallback = pdfjs.PDFPageProxy & {
	width: number;
	height: number;
	originalWidth: number;
	originalHeight: number;
};

function makePageCallback(page: pdfjs.PDFPageProxy, scale: number): PageCallback {
	Object.defineProperty(page, 'width', {
		get() {
			return this.view[2] * scale;
		},
		configurable: true
	});
	Object.defineProperty(page, 'height', {
		get() {
			return this.view[3] * scale;
		},
		configurable: true
	});
	Object.defineProperty(page, 'originalWidth', {
		get() {
			return this.view[2];
		},
		configurable: true
	});
	Object.defineProperty(page, 'originalHeight', {
		get() {
			return this.view[3];
		},
		configurable: true
	});
	return page as PageCallback;
}

function isCancelException(error: Error): boolean {
	return error.name === 'RenderingCancelledException';
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export const CustomCanvas: React.FunctionComponent<{ intent?: string }> = () => {
	const pageContext = usePageContext();
	if (!pageContext) {
		throw new Error('Unable to find Page context.');
	}
	const {
		_className,
		canvasBackground,
		devicePixelRatio = window.devicePixelRatio || 1,
		onRenderError: onRenderErrorProps,
		onRenderSuccess: onRenderSuccessProps,
		page,
		renderForms,
		rotate,
		scale
	} = pageContext;
	if (!page) {
		throw new Error('Attempted to render page canvas, but no page was specified.');
	}
	const canvasElement = useRef<HTMLCanvasElement>(null);
	/**
	 * Called when a page is rendered successfully.
	 */
	const onRenderSuccess = useCallback((): void => {
		if (!page) {
			// Impossible, but TypeScript doesn't know that
			return;
		}
		if (onRenderSuccessProps) {
			onRenderSuccessProps(makePageCallback(page, scale));
		}
	}, [onRenderSuccessProps, page, scale]);
	/**
	 * Called when a page fails to render.
	 */
	const onRenderError = useCallback(
		(error): void => {
			if (isCancelException(error)) {
				return;
			}

			if (onRenderErrorProps) {
				onRenderErrorProps(error);
			}
		},
		[onRenderErrorProps]
	);
	const renderViewport = useMemo(
		() => page.getViewport({ scale: scale * devicePixelRatio, rotation: rotate }),
		[devicePixelRatio, page, rotate, scale]
	);
	const viewport = useMemo(
		() => page.getViewport({ scale, rotation: rotate }),
		[page, rotate, scale]
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Ommitted callbacks so they are not called every time they change
	useEffect(
		function drawPageOnCanvas() {
			if (!page) {
				return;
			}
			// Ensures the canvas will be re-rendered from scratch. Otherwise all form data will stay.
			page.cleanup();
			const { current: canvas } = canvasElement;
			if (!canvas) {
				return;
			}
			const canvasContext = canvas.getContext('2d', { alpha: false });
			if (!canvasContext) {
				return;
			}
			canvas.width = renderViewport.width;
			canvas.height = renderViewport.height;
			canvas.style.width = `${Math.floor(viewport.width)}px`;
			canvas.style.height = `${Math.floor(viewport.height)}px`;
			canvas.style.visibility = 'hidden';
			const renderContext: Parameters<(typeof page)['render']>[0] = {
				annotationMode: renderForms ? 1 : 2,
				canvasContext,
				viewport: renderViewport,
				intent: 'print'
			};
			if (canvasBackground) {
				renderContext.background = canvasBackground;
			}
			const cancellable = page.render(renderContext);
			const runningTask = cancellable;
			cancellable.promise
				.then(() => {
					canvas.style.visibility = '';
					onRenderSuccess();
				})
				.catch(onRenderError);
			// eslint-disable-next-line consistent-return
			return () => cancelRunningTask(runningTask);
		},
		[canvasBackground, page, renderForms, renderViewport, viewport, onRenderError, onRenderSuccess]
	);
	const cleanup = useCallback(() => {
		const { current: canvas } = canvasElement;
		/**
		 * Zeroing the width and height cause most browsers to release graphics
		 * resources immediately, which can greatly reduce memory consumption.
		 */
		if (canvas) {
			canvas.width = 0;
			canvas.height = 0;
		}
	}, []);
	useEffect(() => cleanup, [cleanup]);
	return (
		<canvas
			className={`${_className}__canvas`}
			dir="ltr"
			ref={canvasElement}
			style={{
				display: 'block',
				userSelect: 'none'
			}}
		/>
	);
};
