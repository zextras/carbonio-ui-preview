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

	useEffect(() => {
		if (scrollContainerRef.current) {
			const { clientHeight } = scrollContainerRef.current;
			const options: IntersectionObserverInit = {
				root: scrollContainerRef.current,
				// set root margin to be a line at ~30% of the scrollable area visible height
				rootMargin: `-${clientHeight * 0.3}px 0px -${clientHeight * 0.7}px 0px`,
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

		return (): void => {
			updatePageObserverRef.current && updatePageObserverRef.current.disconnect();
		};
	}, [onPageChange, scrollContainerRef]);

	const observePage = useCallback((pageElement: HTMLElement) => {
		if (updatePageObserverRef.current) {
			updatePageObserverRef.current.observe(pageElement);
		}
	}, []);

	return { observePage };
}
