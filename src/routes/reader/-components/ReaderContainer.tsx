import { useState, useEffect, useMemo } from 'react'
import type { Book } from '../../../types/models/book'
import type { SpineItem } from '../../../types/models/spineItem'
import type { ReadingMode } from '../../../types/models/readingMode'
import PagedReader from './PagedReader'
import ScrollableReader from './ScrollableReader'
import ReaderSurface from './ReaderSurface'

// 'engine' is the new iframe reader, shown next to the old modes until it replaces them
type ReaderChoice = ReadingMode | 'engine'

const MODES: { mode: ReaderChoice; label: string }[] = [
	{ mode: 'scroll', label: 'Scroll' },
	{ mode: 'page', label: 'Pages' },
	{ mode: 'engine', label: 'Pages (new)' },
]

interface ReaderContainerProps {
	book: Book
}

export default function ReaderContainer({ book }: ReaderContainerProps) {
	const [spine, setSpine] = useState<SpineItem[]>([])
	const [mode, setMode] = useState<ReaderChoice>('scroll')

	useEffect(() => {
		void (async () => {
			setSpine(await window.electronAPI.reader.getSpine(book.path))
		})()
	}, [book.path])

	// Stable identity, so the engine is only recreated when the book actually changes
	const readerBook = useMemo(() => ({ id: book.id, spine }), [book.id, spine])

	if (spine.length === 0)
		return null

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-end gap-2 px-4 h-10 bg-[#13131f] border-b border-[#222] shrink-0">
				{MODES.map(({ mode: option, label }) => (
					<button
						key={option}
						onClick={() => setMode(option)}
						className={`text-xs px-3 py-1 rounded border transition-colors ${
							mode === option
								? 'text-indigo-300 border-indigo-500 bg-[#1e1e2e]'
								: 'text-[#555] border-[#333] bg-[#1e1e2e]'
						}`}
					>
						{label}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-hidden flex justify-center">
				<div className="w-full max-w-[700px] h-full overflow-hidden">
					{mode === 'scroll' && <ScrollableReader bookPath={book.path} spine={spine} />}
					{mode === 'page' && <PagedReader bookPath={book.path} spine={spine} />}
					{mode === 'engine' && <ReaderSurface book={readerBook} />}
				</div>
			</div>
		</div>
	)
}
