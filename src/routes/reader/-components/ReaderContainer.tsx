import { useState, useEffect } from 'react'
import type { SpineItem } from '../../../types/models/spineItem'
import type { ReadingMode } from '../../../types/models/readingMode'
import PageReader from './PageReader'
import ScrollableReader from './ScrollableReader'

interface ReaderContainerProps {
	bookPath: string
}

export default function ReaderContainer({ bookPath }: ReaderContainerProps) {
	const [spine, setSpine] = useState<SpineItem[]>([])
	const mode: ReadingMode = 'scroll'

	useEffect(() => {
		window.electronAPI.reader.getSpine(bookPath).then(setSpine).catch(console.error)
	}, [bookPath])

	if (spine.length === 0) return null

	if (mode === 'scroll') return <ScrollableReader bookPath={bookPath} spine={spine} />

	return <PageReader bookPath={bookPath} spine={spine} />
}
