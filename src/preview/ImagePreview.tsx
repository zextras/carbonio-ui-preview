/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Container, Portal, useCombinedRefs } from '@zextras/carbonio-design-system';
import styled from 'styled-components';

import { MakeOptional } from '../utils/utils';
import FocusWithin from './FocusWithin';
import Header, { HeaderAction, HeaderProps } from './Header';
import { AbsoluteLeftIconButton, AbsoluteRightIconButton } from './StyledComponents';

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

const ExternalContainer = styled.div`
	height: 100vh;
	max-height: 100vh;
	width: 100vw;
	max-width: 100vw;
	display: flex;
	flex-direction: column;
	position: relative;
`;

const MiddleContainer = styled(Container)`
	flex-grow: 1;
`;

const Image = styled.img`
	max-height: 100%;
	max-width: 100%;
	min-height: 0;
	min-width: 0;
	align-self: center;
	filter: drop-shadow(0px 5px 14px rgba(0, 0, 0, 0.35));
	border-radius: 4px;
`;

const PreviewContainer = styled.div.attrs({
	$paddingVertical: '32px',
	$paddingHorizontal: '16px',
	$gap: '8px'
})`
	display: flex;
	max-width: 100%;
	max-height: calc(100vh - ${({ $paddingVertical }): string => $paddingVertical} * 2);
	flex-direction: column;
	gap: ${({ $gap }): string => $gap};
	justify-content: center;
	align-items: center;
	overflow: hidden;
	padding: ${({ $paddingVertical, $paddingHorizontal }): string =>
		`${$paddingVertical} ${$paddingHorizontal}`};
	outline: none;
	flex-grow: 1;
`;

type ImagePreviewProps = Partial<Omit<HeaderProps, 'closeAction'>> & {
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
	/** Alternative text for image */
	alt?: string;
	/** Callback  */
	onNextPreview?: (e: React.SyntheticEvent | KeyboardEvent) => void;
	/** Callback  */
	onPreviousPreview?: (e: React.SyntheticEvent | KeyboardEvent) => void;
};

const ImagePreview = React.forwardRef<HTMLDivElement, ImagePreviewProps>(function PreviewFn(
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
		alt,
		onNextPreview,
		onPreviousPreview
	},
	ref
) {
	const previewRef = useCombinedRefs<HTMLDivElement>(ref);
	const imageRef = useRef<HTMLImageElement>(null);

	const $closeAction = useMemo(() => {
		if (closeAction) {
			return {
				onClick: onClose,
				...closeAction
			};
		}
		return closeAction;
	}, [closeAction, onClose]);

	const eventListener = useCallback<(e: KeyboardEvent) => void>(
		(event) => {
			if (event.key === 'Escape') {
				onClose(event);
			} else if (event.key === 'ArrowRight' && onNextPreview) {
				onNextPreview(event);
			} else if (event.key === 'ArrowLeft' && onPreviousPreview) {
				onPreviousPreview(event);
			}
		},
		[onClose, onNextPreview, onPreviousPreview]
	);

	useEffect(() => {
		if (show) {
			document.addEventListener('keydown', eventListener);
		}

		return (): void => {
			document.removeEventListener('keydown', eventListener);
		};
	}, [eventListener, show]);

	const onOverlayClick = useCallback<React.ReactEventHandler>(
		(event) => {
			// TODO: stop propagation or not?
			event.stopPropagation();
			previewRef.current &&
				!event.isDefaultPrevented() &&
				(previewRef.current === event.target ||
					!previewRef.current.contains(event.target as Node)) &&
				onClose(event);
		},
		[onClose, previewRef]
	);

	return (
		<Portal show={show} disablePortal={disablePortal} container={container}>
			<Overlay onClick={onOverlayClick}>
				<FocusWithin>
					<ExternalContainer>
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
							<PreviewContainer ref={previewRef}>
								<Image
									alt={alt ?? filename}
									src={src}
									onError={(error): void => console.error('TODO handle error', error)}
									ref={imageRef}
								/>
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

export { ImagePreview, ImagePreviewProps };
