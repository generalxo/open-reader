import { useState, useEffect } from 'react'
import ReaderView from './ReaderView'
import type { SpineItem } from '../../../types/models/spineItem'
import type { ChapterBundle } from '../../../types/models/chapterBundle'

interface PageReaderProps {
	bookPath: string
	spine: SpineItem[]
}

export default function PageReader({ bookPath, spine }: PageReaderProps) {
	const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
	const [bundle, setBundle] = useState<ChapterBundle | null>(null)
	const [themeStyles] = useState('')

	useEffect(() => {
		if (spine.length === 0) return
		void (async () => {
			setBundle(null)
			setBundle(await window.electronAPI.reader.getChapterBundle(bookPath, spine[currentChapterIndex].href))
		})()
	}, [spine, currentChapterIndex, bookPath])

	const goPrev = () => setCurrentChapterIndex((i) => Math.max(i - 1, 0))
	const goNext = () => setCurrentChapterIndex((i) => Math.min(i + 1, spine.length - 1))

	return (
		<div className="flex flex-row h-full">
			<div className='flex items-center'>
				<button
					onClick={goPrev}
					disabled={currentChapterIndex === 0}
					className="px-4 py-2 bg-slate-700 rounded disabled:opacity-40"
				>
					Prev
				</button>
			</div>

			<div className="grow overflow-hidden">
				{bundle && <ReaderView html={bundle.html} styles={bundle.styles} themeStyles={themeStyles} />}
			</div>

			<div className="flex items-center">
				<button
					onClick={goNext}
					disabled={currentChapterIndex === spine.length - 1}
					className="px-4 py-2 bg-slate-700 rounded disabled:opacity-40"
				>
					Next
				</button>
			</div>
		</div>
	)
}
