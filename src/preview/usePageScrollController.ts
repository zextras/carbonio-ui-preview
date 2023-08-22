/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useRef } from 'react';

export function usePageScrollController(
	scrollContainerRef: React.RefObject<HTMLElement>,
	onPageChange: (pageElement: Element | undefined) => void
): {
	observePage: (pageElement: HTMLElement) => void;
} {
	const updatePageObserverRef = useRef<IntersectionObserver>();
	const currentPageIntersectionEntryRef = useRef<IntersectionObserverEntry>();
	const observedPagesRef = useRef<HTMLElement[]>([]);

	const destroyObserver = useCallback(() => {
		updatePageObserverRef.current?.disconnect();
	}, []);

	const initObserver = useCallback(() => {
		// destroy before creating a new one
		destroyObserver();

		if (scrollContainerRef.current) {
			const { clientHeight } = scrollContainerRef.current;
			const options: IntersectionObserverInit = {
				root: scrollContainerRef.current,
				// set root margin to be a line at ~30% of the scrollable area visible height
				rootMargin: `-${clientHeight * 0.3}px 0px -${clientHeight * 0.65}px 0px`,
				threshold: 0
			};
			updatePageObserverRef.current = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						currentPageIntersectionEntryRef.current = entry;
					}
				});
				onPageChange(currentPageIntersectionEntryRef.current?.target);
			}, options);
		}
	}, [destroyObserver, onPageChange, scrollContainerRef]);

	const reObserveAll = useCallback(() => {
		initObserver();
		observedPagesRef.current.forEach((observedPage) => {
			if (updatePageObserverRef.current) {
				updatePageObserverRef.current.observe(observedPage);
			}
		});
	}, [initObserver]);

	useEffect(() => {
		window.addEventListener('resize', reObserveAll);
		// first run
		initObserver();

		return (): void => {
			// on unmount
			// destroy observer
			destroyObserver();
			// unregister listener
			window.removeEventListener('resize', reObserveAll);
			// cleanup observed pages
			observedPagesRef.current = [];
		};
	}, [initObserver, reObserveAll, destroyObserver]);

	const observePage = useCallback((pageElement: HTMLElement) => {
		if (updatePageObserverRef.current) {
			updatePageObserverRef.current.observe(pageElement);
			observedPagesRef.current.push(pageElement);
		}
	}, []);

	return { observePage };
}
