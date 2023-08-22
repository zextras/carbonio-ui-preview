/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useState } from 'react';

import findIndex from 'lodash/findIndex';
import findLastIndex from 'lodash/findLastIndex';

import { ZOOM_STEPS } from '../constants';

type UseZoomReturnType = {
	currentZoom: number;
	incrementable: boolean;
	decrementable: boolean;
	increaseOfOneStep: () => void;
	decreaseOfOneStep: () => void;
	reset: () => void;
	fitToWidth: () => void;
	fitToWidthActive: boolean;
};

export function useZoom(previewRef: React.RefObject<Element>): UseZoomReturnType {
	const [currentZoom, setCurrentZoom] = useState(ZOOM_STEPS[0]);
	const [incrementable, setIncrementable] = useState(true);
	const [decrementable, setDecrementable] = useState(false);
	const [fitToWidthActive, setFitToWidthActive] = useState(false);

	const reset = useCallback(() => {
		setCurrentZoom(ZOOM_STEPS[0]);
		setIncrementable(true);
		setDecrementable(false);
		setFitToWidthActive(false);
	}, []);

	const increaseOfOneStep = useCallback(() => {
		if (incrementable) {
			const targetIndex = findIndex(ZOOM_STEPS, (step) => step > currentZoom);
			if (targetIndex >= 0) {
				setCurrentZoom(ZOOM_STEPS[targetIndex]);
				if (targetIndex === ZOOM_STEPS.length - 1) {
					setIncrementable(false);
				}
				if (targetIndex > 0) {
					setDecrementable(true);
				}
			}
		}
		setFitToWidthActive(false);
	}, [currentZoom, incrementable]);

	const decreaseOfOneStep = useCallback(() => {
		if (decrementable) {
			const targetIndex = findLastIndex(ZOOM_STEPS, (step) => step < currentZoom);
			if (targetIndex >= 0) {
				setCurrentZoom(ZOOM_STEPS[targetIndex]);
				if (targetIndex === 0) {
					setDecrementable(false);
				}
				if (targetIndex < ZOOM_STEPS.length - 1) {
					setIncrementable(true);
				}
			}
		}
		setFitToWidthActive(false);
	}, [currentZoom, decrementable]);

	const fitToWidth = useCallback(() => {
		if (previewRef.current) {
			setCurrentZoom(previewRef.current.clientWidth);
			setIncrementable(previewRef.current.clientWidth < ZOOM_STEPS[ZOOM_STEPS.length - 1]);
			setDecrementable(previewRef.current.clientWidth > ZOOM_STEPS[0]);
			setFitToWidthActive(true);
		}
	}, [previewRef]);

	useEffect(() => {
		if (fitToWidthActive) {
			window.addEventListener('resize', fitToWidth);
		}
		return (): void => {
			window.removeEventListener('resize', fitToWidth);
		};
	}, [fitToWidth, fitToWidthActive]);

	return {
		currentZoom,
		incrementable,
		decrementable,
		increaseOfOneStep,
		decreaseOfOneStep,
		reset,
		fitToWidth,
		fitToWidthActive
	};
}
