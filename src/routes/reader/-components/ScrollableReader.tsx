import { useState, useEffect, useRef, useCallback } from 'react'
import ReaderView from './ReaderView'
import type { SpineItem } from '../../../types/models/spineItem'
import type { ChapterBundle } from '../../../types/models/chapterBundle'

const WINDOW_RADIUS = 2

interface ScrollableReaderProps {
	bookPath: string
	spine: SpineItem[]
}

export default function ScrollableReader({ bookPath, spine }: ScrollableReaderProps) {
	const [loadedBundles, setLoadedBundles] = useState<Map<number, ChapterBundle>>(new Map())

	const currentIndexRef = useRef(0)
	const fetchedIndices = useRef<Set<number>>(new Set())
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const chapterRefs = useRef<Map<number, HTMLDivElement>>(new Map())
	const rafRef = useRef<number | null>(null)

	const loadChapter = useCallback(async (index: number): Promise<void> => {
		if (index < 0 || index >= spine.length) return
		if (fetchedIndices.current.has(index)) return

		fetchedIndices.current.add(index)
		try {
			const bundle = await window.electronAPI.reader.getChapterBundle(bookPath, spine[index].href)
			setLoadedBundles((prev) => new Map(prev).set(index, bundle))
		} catch {
			fetchedIndices.current.delete(index)
		}
	}, [bookPath, spine])

	const updateWindow = useCallback(async (curr: number) => {
		currentIndexRef.current = curr

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
		loadChapter(curr + 2)
		loadChapter(curr - 2)
	}, [loadChapter])

	useEffect(() => {
		updateWindow(0)
	}, [updateWindow])

	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		const onScroll = () => {
			if (rafRef.current !== null) return
			rafRef.current = requestAnimationFrame(() => {
				rafRef.current = null
				const containerRect = container.getBoundingClientRect()
				const midpoint = containerRect.top + containerRect.height / 2

				let curr = 0
				for (const [idx, el] of chapterRefs.current) {
					const rect = el.getBoundingClientRect()
					if (rect.top <= midpoint) curr = idx
				}

				if (curr !== currentIndexRef.current) {
					updateWindow(curr)
				}
			})
		}

		container.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			container.removeEventListener('scroll', onScroll)
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
		}
	}, [updateWindow])

	const registerChapterRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
		if (el) {
			chapterRefs.current.set(index, el)
		} else {
			chapterRefs.current.delete(index)
		}
	}, [])

	return (
		<div ref={scrollContainerRef} className="h-full overflow-y-auto">
			{spine.map((spineItem, index) => {
				const bundle = loadedBundles.get(index)
				return (
					<div key={spineItem.id} ref={registerChapterRef(index)} className="w-full">
						{bundle ? (
							<ReaderView html={bundle.html} styles={bundle.styles} themeStyles="" autoHeight />
						) : (
							<div className="w-full min-h-screen flex items-center justify-center">
								<span className="text-slate-400 text-sm">Loading…</span>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
