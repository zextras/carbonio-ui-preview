/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, createContext, useReducer, useState, useMemo, useContext } from 'react';
import * as React from 'react';

import { ImagePreviewProps } from './ImagePreview.js';
import { PdfPreviewProps } from './PdfPreview.js';
import { PreviewWrapper, PreviewWrapperProps } from './PreviewWrapper.js';
import { VideoPreviewProps } from './VideoPreview.js';
import { type MakeOptional } from '../types/utils.js';

/**
 * Define an item for the preview. It can be of type 'image' or 'pdf'.
 * The id is required to control the opening of the preview after its initialization.
 */
export type PreviewItem = (
	| (MakeOptional<Omit<ImagePreviewProps, 'show'>, 'onClose'> & { previewType: 'image' })
	| (MakeOptional<Omit<VideoPreviewProps, 'show'>, 'onClose'> & { previewType: 'video' })
	| (MakeOptional<Omit<PdfPreviewProps, 'show'>, 'onClose'> & { previewType: 'pdf' })
) & {
	id: string;
};

export interface PreviewManagerContextType {
	/** Initialize and open the preview for the given item */
	createPreview: (item: MakeOptional<PreviewItem, 'id'>) => void;
	/**
	 * Initialize the preview for the given items. This function does not open the preview.
	 * Use openPreview to open the preview for one of the initialized items.
	 */
	initPreview: (items: PreviewItem[]) => void;
	/**
	 * Open the preview for the item with the given id. The item must have been initialized
	 * before with the initPreview method.
	 */
	openPreview: (id: string) => void;
	/** Clear the initialized previews */
	emptyPreview: () => void;
	/** The list of initialized previews */
	previews: PreviewItem[];
	/** The index of the currently opened preview */
	currentIndex: number;
}

/**
 * The context give access to the functions needed to manage multiple previews.
 * It must be used together with the PreviewManager.
 */
export const PreviewsManagerContext = createContext<PreviewManagerContextType>({
	createPreview: () => undefined,
	initPreview: () => undefined,
	openPreview: () => undefined,
	emptyPreview: () => undefined,
	previews: [],
	currentIndex: -1
});

/** Util hook to quick access to the preview functions */
export const usePreview = (): PreviewManagerContextType => useContext(PreviewsManagerContext);

/**
 * The manager for showing multiple previews.
 * From within it, the PreviewsManagerContext give access to the functions to initialize and open
 * the previews of different items.
 */
export const PreviewManager = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
	const [previews, dispatchPreviews] = useReducer(
		(state: PreviewItem[], action: { type: 'empty' } | { type: 'init'; value: PreviewItem[] }) => {
			switch (action.type) {
				case 'init': {
					return action.value;
				}
				case 'empty': {
					return [];
				}
				default: {
					return state;
				}
			}
		},
		[]
	);

	const [currentIndex, setCurrentIndex] = useState(-1);

	const previewElement: React.ReactElement | undefined = useMemo(() => {
		if (currentIndex >= 0) {
			const { onClose, ...props } = previews[currentIndex];
			const closePreview: PreviewWrapperProps['onClose'] = (ev) => {
				if (onClose) onClose(ev);
				setCurrentIndex(-1);
			};
			const onPreviousPreviewCallback: PreviewWrapperProps['onPreviousPreview'] =
				currentIndex === 0
					? undefined
					: (e: React.SyntheticEvent | KeyboardEvent): void => {
							e.stopPropagation();
							setCurrentIndex(currentIndex - 1);
						};
			const onNextPreviewCallback: PreviewWrapperProps['onNextPreview'] =
				currentIndex === previews.length - 1
					? undefined
					: (e: React.SyntheticEvent | KeyboardEvent): void => {
							e.stopPropagation();
							setCurrentIndex(currentIndex + 1);
						};
			return (
				<PreviewWrapper
					{...props}
					key={props.id}
					show
					onClose={closePreview}
					onPreviousPreview={onPreviousPreviewCallback}
					onNextPreview={onNextPreviewCallback}
				/>
			);
		}
		return undefined;
	}, [currentIndex, previews]);

	const createPreview = useCallback<PreviewManagerContextType['createPreview']>(
		(args) => {
			dispatchPreviews({
				type: 'init',
				value: [{ id: 'default-id', ...args }]
			});
			setCurrentIndex(0);
		},
		[dispatchPreviews]
	);

	const emptyPreview = useCallback<() => void>(() => {
		dispatchPreviews({
			type: 'empty'
		});
		setCurrentIndex(-1);
	}, [dispatchPreviews]);

	const initPreview = useCallback<(args: PreviewItem[]) => void>(
		(args) => {
			dispatchPreviews({
				type: 'init',
				value: args
			});
		},
		[dispatchPreviews]
	);

	const openPreview = useCallback<(id: string) => void>(
		(id) => {
			const index = previews.findIndex((preview) => preview.id === id);
			if (index >= 0) {
				setCurrentIndex(index);
			}
		},
		[previews, setCurrentIndex]
	);

	const previewManagerContextValue = useMemo(
		() => ({ createPreview, initPreview, openPreview, emptyPreview, previews, currentIndex }),
		[createPreview, emptyPreview, initPreview, openPreview, previews, currentIndex]
	);

	return (
		<>
			<PreviewsManagerContext.Provider value={previewManagerContextValue}>
				{children}
			</PreviewsManagerContext.Provider>
			{previewElement}
		</>
	);
};
