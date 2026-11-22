import { useEffect } from 'react'
import { motion } from 'motion/react'
import { THEMES, type ReaderSettings } from '../../../reader/settings'
import type { TocEntry } from '../../../reader/toc'
import type { ReaderBook } from '../../../reader/types'
import { usePageTurnInput } from './usePageTurnInput'
import { useReaderEngine } from './useReaderEngine'
import { useReadingProgress } from './useReadingProgress'
import TocPanel from './TocPanel'

const ARROW_CLASS = 'absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 disabled:opacity-0 cursor-pointer'

interface ReaderSurfaceProps {
	book: ReaderBook
	settings: ReaderSettings
	toc: TocEntry[] | null
	tocOpen: boolean
	onTocClose: () => void
}

export default function ReaderSurface({ book, settings, toc, tocOpen, onTocClose }: ReaderSurfaceProps) {
	const { ready, start, record } = useReadingProgress(book)
	const { containerRef, relocation, next, prev, goToHref } = useReaderEngine(book, settings, start, ready)
	usePageTurnInput(containerRef, next, prev, !tocOpen)

	useEffect(() => {
		if (!tocOpen)
			return

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape')
				onTocClose()
		}
		window.addEventListener('keydown', onKeyDown)

		return () => window.removeEventListener('keydown', onKeyDown)
	}, [tocOpen, onTocClose])

	const selectTocEntry = (entry: TocEntry) => {
		onTocClose()
		if (entry.href)
			void goToHref(entry.href, entry.fragment)
	}

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

			{tocOpen && (
				<TocPanel entries={toc} currentHref={relocation?.locator.href ?? null} onSelect={selectTocEntry} onClose={onTocClose} />
			)}

			{indicator && (
				<div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs opacity-40 select-none" style={{ color: THEMES[settings.theme].text }}>
					{indicator}
				</div>
			)}
		</div>
	)
}
