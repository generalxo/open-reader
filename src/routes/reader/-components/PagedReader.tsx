import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import PagedReaderView from './PagedReaderView'
import type { SpineItem } from '../../../types/models/spineItem'
import type { ChapterBundle } from '../../../types/models/chapterBundle'

interface PagedReaderProps {
	bookPath: string
	spine: SpineItem[]
}

export default function PagedReader({ bookPath, spine }: PagedReaderProps) {
	const [chapterIndex, setChapterIndex] = useState(0)
	const [pageIndex, setPageIndex] = useState(0)
	const [pageCount, setPageCount] = useState(0)
	const [bundle, setBundle] = useState<ChapterBundle | null>(null)
	const pendingLastPageRef = useRef(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const lastWheelRef = useRef(0)

	useEffect(() => {
		void (async () => {
			setBundle(null)
			setBundle(await window.electronAPI.reader.getChapterBundle(bookPath, spine[chapterIndex].href))
		})()
	}, [bookPath, chapterIndex, spine])

	const handlePageCountReady = useCallback((count: number) => {
		setPageCount(count)
		if (pendingLastPageRef.current) {
			setPageIndex(count - 1)
			pendingLastPageRef.current = false
		} else {
			setPageIndex(i => Math.min(i, count - 1))
		}
	}, [])

	const goNext = useCallback(() => {
		if (pageIndex < pageCount - 1) {
			setPageIndex(i => i + 1)
		} else if (chapterIndex < spine.length - 1) {
			setChapterIndex(i => i + 1)
			setPageIndex(0)
			setPageCount(0)
		}
	}, [pageIndex, pageCount, chapterIndex, spine.length])

	const goPrev = useCallback(() => {
		if (pageIndex > 0) {
			setPageIndex(i => i - 1)
		} else if (chapterIndex > 0) {
			pendingLastPageRef.current = true
			setChapterIndex(i => i - 1)
			setPageIndex(0)
			setPageCount(0)
		}
	}, [pageIndex, chapterIndex])

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') goNext()
			if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') goPrev()
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [goNext, goPrev])

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const onWheel = (e: WheelEvent) => {
			e.preventDefault()
			const now = Date.now()
			if (now - lastWheelRef.current < 300) return
			lastWheelRef.current = now
			if (e.deltaY > 0) goNext()
			else goPrev()
		}

		container.addEventListener('wheel', onWheel, { passive: false })
		return () => container.removeEventListener('wheel', onWheel)
	}, [goNext, goPrev])

	const atStart = chapterIndex === 0 && pageIndex === 0
	const atEnd = pageCount > 0 && chapterIndex === spine.length - 1 && pageIndex === pageCount - 1

	return (
		<div ref={containerRef} className="relative w-full h-full">
			<motion.button
				initial={{ opacity: 0.3 }}
				whileHover={{ opacity: 1 }}
				onClick={goPrev}
				disabled={atStart}
				aria-label="Previous page"
				className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 disabled:opacity-0 cursor-pointer"
			>
				‹
			</motion.button>

			<div className="w-full h-full">
				{bundle && (
					<PagedReaderView
						bundle={bundle}
						pageIndex={pageIndex}
						onPageCountReady={handlePageCountReady}
					/>
				)}
			</div>

			<motion.button
				initial={{ opacity: 0.3 }}
				whileHover={{ opacity: 1 }}
				onClick={goNext}
				disabled={atEnd}
				aria-label="Next page"
				className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 disabled:opacity-0 cursor-pointer"
			>
				›
			</motion.button>
		</div>
	)
}
