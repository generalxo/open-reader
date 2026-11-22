import { useEffect } from 'react'
import { motion } from 'motion/react'
import { THEMES, type ReaderSettings } from '../../../reader/settings'
import type { ReaderBook } from '../../../reader/types'
import { usePageTurnInput } from './usePageTurnInput'
import { useReaderEngine } from './useReaderEngine'
import { useReadingProgress } from './useReadingProgress'

const ARROW_CLASS = 'absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 disabled:opacity-0 cursor-pointer'

interface ReaderSurfaceProps {
	book: ReaderBook
	settings: ReaderSettings
}

export default function ReaderSurface({ book, settings }: ReaderSurfaceProps) {
	const { ready, start, record } = useReadingProgress(book)
	const { containerRef, relocation, next, prev } = useReaderEngine(book, settings, start, ready)
	usePageTurnInput(containerRef, next, prev)

	useEffect(() => {
		if (relocation)
			record(relocation.locator)
	}, [relocation, record])

	// Paginated: page within the chapter. Scrolled: how far through the whole book.
	const page = relocation?.page
	const indicator = page
		? `${page.index + 1} / ${page.count}`
		: relocation ? `${Math.round(relocation.locator.totalProgression * 100)}%` : null

	return (
		<div className="relative w-full h-full">
			<motion.button
				initial={{ opacity: 0.3 }}
				whileHover={{ opacity: 1 }}
				onClick={() => { void prev() }}
				disabled={relocation?.atStart ?? true}
				aria-label="Previous page"
				className={`${ARROW_CLASS} left-0`}
			>
				‹
			</motion.button>

			<div ref={containerRef} data-testid="reader-surface" className="w-full h-full" />

			<motion.button
				initial={{ opacity: 0.3 }}
				whileHover={{ opacity: 1 }}
				onClick={() => { void next() }}
				disabled={relocation?.atEnd ?? true}
				aria-label="Next page"
				className={`${ARROW_CLASS} right-0`}
			>
				›
			</motion.button>

			{indicator && (
				<div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs opacity-40 select-none" style={{ color: THEMES[settings.theme].text }}>
					{indicator}
				</div>
			)}
		</div>
	)
}
