/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, createContext, useReducer, useState, useMemo } from 'react';

import findIndex from 'lodash/findIndex';

import { ImagePreviewProps } from './ImagePreview';
import { PdfPreviewProps } from './PdfPreview';
import { PreviewWrapper, PreviewWrapperProps } from './PreviewWrapper';
import { type MakeOptional } from '../utils/type-utils';

type PreviewArgType = (
	| MakeOptional<Omit<ImagePreviewProps, 'show'>, 'onClose'>
	| MakeOptional<Omit<PdfPreviewProps, 'show'>, 'onClose'>
) & {
	previewType: 'pdf' | 'image';
	id?: string;
};

export type PreviewManagerContextType = {
	createPreview: (args: PreviewArgType) => void;
	initPreview: (args: Array<PreviewArgType & { id: string }>) => void;
	openPreview: (id: string) => void;
	emptyPreview: () => void;
};

const PreviewsManagerContext = createContext<PreviewManagerContextType>({
	createPreview: () => undefined,
	initPreview: () => undefined,
	openPreview: () => undefined,
	emptyPreview: () => undefined
});

const PreviewManager: React.FC = ({ children }) => {
	const [previews, dispatchPreviews] = useReducer(
		(
			state: Array<PreviewArgType>,
			action: { type: 'empty' } | { type: 'init'; value: Array<PreviewArgType> }
		) => {
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

	const [openArrayIndex, setOpenArrayIndex] = useState(-1);

	const previewElement: React.ReactElement | undefined = useMemo(() => {
		if (openArrayIndex >= 0) {
			const { onClose, ...props } = previews[openArrayIndex];
			const closePreview: PreviewWrapperProps['onClose'] = (ev) => {
				if (onClose) onClose(ev);
				setOpenArrayIndex(-1);
			};
			const onPreviousPreviewCallback: PreviewWrapperProps['onPreviousPreview'] =
				openArrayIndex === 0
					? undefined
					: (e): void => {
							e.stopPropagation();
							setOpenArrayIndex(openArrayIndex - 1);
					  };
			const onNextPreviewCallback: PreviewWrapperProps['onNextPreview'] =
				openArrayIndex === previews.length - 1
					? undefined
					: (e): void => {
							e.stopPropagation();
							setOpenArrayIndex(openArrayIndex + 1);
					  };
			return (
				<PreviewWrapper
					{...props}
					show
					onClose={closePreview}
					onPreviousPreview={onPreviousPreviewCallback}
					onNextPreview={onNextPreviewCallback}
				/>
			);
		}
		return undefined;
	}, [openArrayIndex, previews]);

	const createPreview = useCallback<(args: PreviewArgType) => void>(
		(args) => {
			dispatchPreviews({
				type: 'init',
				value: [args]
			});
			setOpenArrayIndex(0);
		},
		[dispatchPreviews]
	);

	const emptyPreview = useCallback<() => void>(() => {
		dispatchPreviews({
			type: 'empty'
		});
		setOpenArrayIndex(-1);
	}, [dispatchPreviews]);

	const initPreview = useCallback<(args: Array<PreviewArgType>) => void>(
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
			const index = findIndex(previews, (preview: PreviewArgType) => preview.id === id);
			if (index >= 0) {
				setOpenArrayIndex(index);
			}
		},
		[previews, setOpenArrayIndex]
	);

	const previewManagerContextValue = useMemo(
		() => ({ createPreview, initPreview, openPreview, emptyPreview }),
		[createPreview, emptyPreview, initPreview, openPreview]
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

export { PreviewsManagerContext, PreviewManager };
