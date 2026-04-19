import { useState, useEffect, useRef, useCallback } from 'react'
import ScrollableReaderView from './ScrollableReaderView'
import type { SpineItem } from '../../../types/models/spineItem'
import type { ChapterBundle } from '../../../types/models/chapterBundle'

const WINDOW_RADIUS = 1

interface ScrollableReaderProps {
	bookPath: string
	spine: SpineItem[]
}

export default function ScrollableReader({ bookPath, spine }: ScrollableReaderProps) {
	const [loadedBundles, setLoadedBundles] = useState<Map<number, ChapterBundle>>(new Map())

	const fetchedIndices = useRef<Set<number>>(new Set())

	const loadChapter = useCallback(async (index: number): Promise<void> => {
		if (index < 0 || index >= spine.length)
			return

		if (fetchedIndices.current.has(index))
			return

		fetchedIndices.current.add(index)
		try {
			const bundle = await window.electronAPI.reader.getChapterBundle(bookPath, spine[index].href)
			setLoadedBundles((prev) => new Map(prev).set(index, bundle))
		} catch {
			fetchedIndices.current.delete(index)
		}
	}, [bookPath, spine])

	const updateWindow = useCallback(async (curr: number) => {
		setLoadedBundles((prev) => {
			const next = new Map(prev)
			let changed = false
			for (const [idx] of prev) {
				if (Math.abs(idx - curr) > WINDOW_RADIUS) {
					next.delete(idx)
					fetchedIndices.current.delete(idx)
					changed = true
				}
			}
			return changed ? next : prev
		})

		await loadChapter(curr)

		loadChapter(curr + 1)
		loadChapter(curr - 1)
	}, [loadChapter])

	useEffect(() => {
		updateWindow(0)
	}, [updateWindow])

	return (
		<ScrollableReaderView
			spine={spine}
			loadedBundles={loadedBundles}
			onCurrentChapterChange={updateWindow}
		/>
	)
}
